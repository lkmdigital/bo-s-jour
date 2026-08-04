<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class ValidateFileUpload
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Vérifier si des fichiers sont uploadés
        if ($request->hasFile('*')) {
            $files = $request->allFiles();
            
            foreach ($files as $key => $file) {
                // Vérifier la taille (max 5MB)
                if ($file->getSize() > 5 * 1024 * 1024) {
                    Log::channel('security')->warning('File upload rejected - size too large', [
                        'file_name' => $file->getClientOriginalName(),
                        'file_size' => $file->getSize(),
                        'ip' => $request->ip(),
                        'timestamp' => now()->toIso8601String(),
                    ]);
                    
                    return response()->json([
                        'message' => 'File size exceeds maximum allowed size (5MB)'
                    ], 413);
                }
                
                // Vérifier le type MIME
                $allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
                $mimeType = $file->getMimeType();
                
                if (!in_array($mimeType, $allowedMimes)) {
                    Log::channel('security')->warning('File upload rejected - invalid MIME type', [
                        'file_name' => $file->getClientOriginalName(),
                        'mime_type' => $mimeType,
                        'ip' => $request->ip(),
                        'timestamp' => now()->toIso8601String(),
                    ]);
                    
                    return response()->json([
                        'message' => 'Invalid file type. Only images (JPEG, PNG, GIF) are allowed.'
                    ], 415);
                }
                
                // Vérifier l'extension
                $extension = strtolower($file->getClientOriginalExtension());
                $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];
                
                if (!in_array($extension, $allowedExtensions)) {
                    Log::channel('security')->warning('File upload rejected - invalid extension', [
                        'file_name' => $file->getClientOriginalName(),
                        'extension' => $extension,
                        'ip' => $request->ip(),
                        'timestamp' => now()->toIso8601String(),
                    ]);
                    
                    return response()->json([
                        'message' => 'Invalid file extension.'
                    ], 415);
                }
                
                // Vérifier le nom du fichier (prévenir les injections)
                $fileName = $file->getClientOriginalName();
                if (preg_match('/[<>:"|?*\x00-\x1F]/', $fileName)) {
                    Log::channel('security')->warning('File upload rejected - suspicious filename', [
                        'file_name' => $fileName,
                        'ip' => $request->ip(),
                        'timestamp' => now()->toIso8601String(),
                    ]);
                    
                    return response()->json([
                        'message' => 'Invalid file name.'
                    ], 400);
                }
            }
        }
        
        return $next($request);
    }
}

