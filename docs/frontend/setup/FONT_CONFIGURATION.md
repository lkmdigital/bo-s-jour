# Configuration des Polices - Application Bosejour

## 📝 Polices Utilisées

### 1. Police Principale : **DM Sans**
- **Utilisation** : Toute l'application par défaut
- **Source** : Google Fonts (chargée via Next.js dans `layout.tsx`)
- **Configuration** : 
  - Variable CSS : `--font-dm-sans`
  - Tailwind : `font-sans` (par défaut)
  - Classe CSS : Utilisée automatiquement sur `body`

### 2. Police des Slogans : **Brush Script MT Italic**
- **Utilisation** : Uniquement pour les slogans "Votre séjour commence ici..."
- **Source** : Police système (Brush Script MT) avec fallback
- **Configuration** :
  - Variable CSS : `--font-slogan: 'Brush Script MT', 'Brush Script Std', cursive`
  - Tailwind : `font-slogan`
  - Classe CSS : `.font-slogan` avec `font-style: italic`

### 3. Police du Logo : **IBM Plex Sans Condensed**
- **Utilisation** : Logo texte (fallback si l'image n'est pas disponible)
- **Source** : Google Fonts
- **Configuration** :
  - Variable CSS : `--font-logo`
  - Tailwind : `font-logo`
  - Classe CSS : `.font-logo`

### 4. Police Monospace : **font-mono**
- **Utilisation** : Codes, IDs, références de transaction
- **Source** : Police système monospace
- **Configuration** : Tailwind `font-mono` (par défaut)

## ✅ Vérification de la Configuration

### Fichiers de Configuration

1. **`app/layout.tsx`**
   - ✅ DM Sans chargée via `next/font/google`
   - ✅ Variable `--font-dm-sans` définie

2. **`app/globals.css`**
   - ✅ Import DM Sans depuis Google Fonts
   - ✅ `body` utilise `var(--font-dm-sans)`
   - ✅ `.font-slogan` défini avec Brush Script MT Italic
   - ✅ `.font-logo` défini avec IBM Plex Sans Condensed

3. **`tailwind.config.ts`**
   - ✅ `fontFamily.sans` = DM Sans (par défaut)
   - ✅ `fontFamily.slogan` = Brush Script MT
   - ✅ `fontFamily.logo` = IBM Plex Sans Condensed

### Utilisation dans les Composants

#### ✅ Slogans (Brush Script MT Italic)
- `app/page.tsx` : `<h1 className="font-slogan">`
- `components/common/Footer.tsx` : `<p className="font-slogan">`
- `components/payment/PaymentReceipt.tsx` : Style inline dans le HTML du PDF

#### ✅ Police Principale (DM Sans)
- Utilisée par défaut partout via `body` dans `globals.css`
- Tous les composants héritent de DM Sans automatiquement

#### ✅ Logo (IBM Plex Sans Condensed)
- `components/common/Logo.tsx` : Utilise `font-logo` (fallback texte)

#### ✅ Monospace (pour codes/IDs)
- `components/payment/PaymentReceipt.tsx` : `font-mono` pour transaction_id
- `app/bookings/[id]/payment/page.tsx` : `font-mono` pour payment_reference
- `app/dashboard/admin/users/[id]/page.tsx` : `font-mono` pour last_login_ip

## 🔍 Points de Vérification

### ✅ Configuration Correcte
- [x] DM Sans chargée dans `layout.tsx`
- [x] DM Sans définie comme police par défaut dans `globals.css`
- [x] DM Sans définie dans `tailwind.config.ts` comme `font-sans`
- [x] Brush Script MT définie pour les slogans
- [x] Tous les slogans utilisent `font-slogan`
- [x] PaymentReceipt utilise DM Sans dans le PDF

### 📋 Règles d'Utilisation

1. **Texte normal** : Utilise automatiquement DM Sans (pas besoin de classe)
2. **Slogans** : Utiliser `className="font-slogan"` ou `font-slogan` (Tailwind)
3. **Logo texte** : Utiliser `className="font-logo"` ou `font-logo` (Tailwind)
4. **Codes/IDs** : Utiliser `font-mono` (Tailwind) pour les références techniques

## 🚀 Déploiement

Après modification, déployer avec :

```bash
cd /Users/lkmdigital/monbeaupays.com/frontend
./update-frontend.sh
```

## 📝 Notes

- **DM Sans** est chargée via Next.js Font Optimization (meilleure performance)
- **Brush Script MT** est une police système (pas besoin de téléchargement)
- **IBM Plex Sans Condensed** est chargée depuis Google Fonts pour le logo
- Les polices sont optimisées pour le chargement (display: swap)



