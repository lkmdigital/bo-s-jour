<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;
use Intervention\Image\ImageManager;
use Illuminate\Support\Str;

class ImageUploadService
{
    private ImageManager $imageManager;

    public function __construct()
    {
        $this->imageManager = ImageManager::gd();
    }

    /**
     * Upload une image avec compression automatique si > 3Mo
     *
     * @param UploadedFile $file
     * @param string $directory Dossier de stockage (ex: 'rooms/123', 'accommodations/456')
     * @param string|null $prefix Préfixe pour le nom de fichier (ex: 'room_', 'acc_')
     * @param int $compressionThreshold Taille en octets pour déclencher la compression (défaut: 3Mo)
     * @param int $quality Qualité de compression (défaut: 60)
     * @param int $maxWidth Largeur max (défaut: 1920)
     * @param int $maxHeight Hauteur max (défaut: 1080)
     * @return array ['path' => string, 'url' => string, 'full_url' => string]
     * @throws \Exception
     */
    public function upload(
        UploadedFile $file,
        string $directory,
        ?string $prefix = null,
        int $compressionThreshold = 3145728, // 3 * 1024 * 1024
        int $quality = 60,
        int $maxWidth = 1920,
        int $maxHeight = 1080
    ): array {
        $sizeBytes = $file->getSize();
        $shouldCompress = $sizeBytes > $compressionThreshold;

        if ($shouldCompress) {
            try {
                $path = $this->compressAndStore(
                    $file,
                    $directory,
                    $prefix,
                    $quality,
                    $maxWidth,
                    $maxHeight
                );
            } catch (\Throwable $e) {
                \Log::warning('Image compression failed, falling back to original file', [
                    'file_name' => $file->getClientOriginalName(),
                    'error' => $e->getMessage(),
                ]);
                $path = $this->storeOriginal($file, $directory, $prefix);
            }
        } else {
            $path = $this->storeOriginal($file, $directory, $prefix);
        }

        if (!$path) {
            throw new \Exception('Failed to store image file');
        }

        // Générer les URLs
        $url = Storage::url($path);
        $fullUrl = asset($url);

        // Fallback mutualisé : copier aussi dans public/storage
        $this->copyToPublicStorage($path);

        return [
            'path' => $path,
            'url' => $url,
            'full_url' => $fullUrl,
            'size' => $sizeBytes,
            'compressed' => $shouldCompress,
        ];
    }

    /**
     * Upload multiple images
     *
     * @param array $files
     * @param string $directory
     * @param string|null $prefix
     * @return array Tableau de résultats
     */
    public function uploadMultiple(
        array $files,
        string $directory,
        ?string $prefix = null
    ): array {
        $results = [];
        $errors = [];

        foreach ($files as $index => $file) {
            if (!$file instanceof UploadedFile || !$file->isValid()) {
                $errors[] = "Fichier invalide à l'index {$index}";
                continue;
            }

            try {
                $results[] = $this->upload($file, $directory, $prefix);
            } catch (\Exception $e) {
                $errors[] = "Erreur fichier {$index}: " . $e->getMessage();
                \Log::error('Upload failed', [
                    'index' => $index,
                    'file_name' => $file->getClientOriginalName(),
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return [
            'uploaded' => $results,
            'errors' => $errors,
            'count' => count($results),
        ];
    }

    /**
     * Supprimer une image du storage
     *
     * @param string $imagePath Chemin ou URL de l'image
     * @param bool $isUrl Si true, extrait le chemin de l'URL
     * @return bool
     */
    public function delete(string $imagePath, bool $isUrl = false): bool
    {
        try {
            $pathToDelete = $imagePath;

            // Si c'est une URL, extraire le chemin
            if ($isUrl || str_starts_with($imagePath, 'http')) {
                if (preg_match('#/storage/(.+)$#', $imagePath, $matches)) {
                    $pathToDelete = $matches[1];
                }
            }

            if (empty($pathToDelete) || str_starts_with($pathToDelete, 'http')) {
                return false;
            }

            // Supprimer de storage/app/public
            Storage::disk('public')->delete($pathToDelete);

            // Supprimer aussi de public/storage (fallback)
            $publicPath = public_path('storage/' . $pathToDelete);
            if (File::exists($publicPath)) {
                File::delete($publicPath);
            }

            return true;
        } catch (\Exception $e) {
            \Log::warning('Failed to delete image', [
                'path' => $imagePath,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Valider un fichier image
     *
     * @param UploadedFile $file
     * @param int $maxSizeMB Taille max en Mo
     * @param array $allowedTypes Types MIME autorisés
     * @return array ['valid' => bool, 'error' => string|null]
     */
    public function validate(
        UploadedFile $file,
        int $maxSizeMB = 10,
        array $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    ): array {
        if (!$file->isValid()) {
            $error = $file->getError();
            $messages = [
                UPLOAD_ERR_INI_SIZE => 'Fichier trop volumineux (limite serveur)',
                UPLOAD_ERR_FORM_SIZE => 'Fichier trop volumineux',
                UPLOAD_ERR_PARTIAL => 'Upload partiel',
                UPLOAD_ERR_NO_FILE => 'Aucun fichier reçu',
                UPLOAD_ERR_NO_TMP_DIR => 'Erreur serveur (dossier temporaire)',
                UPLOAD_ERR_CANT_WRITE => 'Erreur serveur (écriture impossible)',
                UPLOAD_ERR_EXTENSION => 'Upload bloqué par extension serveur',
            ];
            return [
                'valid' => false,
                'error' => $messages[$error] ?? "Erreur upload (code {$error})",
            ];
        }

        if (!in_array($file->getMimeType(), $allowedTypes)) {
            return [
                'valid' => false,
                'error' => 'Type de fichier non autorisé. Types acceptés: ' . implode(', ', $allowedTypes),
            ];
        }

        if ($file->getSize() > $maxSizeMB * 1024 * 1024) {
            return [
                'valid' => false,
                'error' => "Fichier trop volumineux (max {$maxSizeMB}MB)",
            ];
        }

        return ['valid' => true, 'error' => null];
    }

    /**
     * Compresser et stocker une image
     */
    private function compressAndStore(
        UploadedFile $file,
        string $directory,
        ?string $prefix,
        int $quality,
        int $maxWidth,
        int $maxHeight
    ): string {
        $image = $this->imageManager->read($file->getPathname());
        $image->scaleDown($maxWidth, $maxHeight);

        $extension = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        if (!in_array($extension, ['jpg', 'jpeg', 'png', 'webp'])) {
            $extension = 'jpg';
        }

        $encoded = $image->encode($extension, $quality);
        $fileName = $this->generateFileName($prefix, $extension);
        $path = $directory . '/' . $fileName;

        // Créer le dossier avec permissions explicites si nécessaire
        $fullDirPath = Storage::disk('public')->path($directory);
        if (!is_dir($fullDirPath)) {
            @mkdir($fullDirPath, 0755, true);
        }

        Storage::disk('public')->put($path, (string) $encoded);

        return $path;
    }

    /**
     * Stocker le fichier original sans compression
     */
    private function storeOriginal(UploadedFile $file, string $directory, ?string $prefix): string
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $fileName = $this->generateFileName($prefix, $extension);

        // Créer le dossier avec permissions explicites si nécessaire
        $fullDirPath = Storage::disk('public')->path($directory);
        if (!is_dir($fullDirPath)) {
            @mkdir($fullDirPath, 0755, true);
        }

        return $file->storeAs($directory, $fileName, 'public');
    }

    /**
     * Copier dans public/storage (fallback pour hébergement mutualisé)
     */
    private function copyToPublicStorage(string $path): void
    {
        try {
            $publicPath = public_path('storage/' . $path);
            File::ensureDirectoryExists(dirname($publicPath));
            File::copy(Storage::disk('public')->path($path), $publicPath);
        } catch (\Exception $e) {
            \Log::warning('Failed to copy to public/storage', [
                'path' => $path,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Générer un nom de fichier unique
     */
    private function generateFileName(?string $prefix, string $extension): string
    {
        $prefix = $prefix ? rtrim($prefix, '_') . '_' : '';
        return $prefix . Str::uuid()->toString() . '.' . $extension;
    }
}
