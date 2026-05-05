# Documentation de Sécurité

Ce document décrit les mesures de sécurité implémentées dans l'application.

## 1. Rate Limiting (Limitation de débit)

### Routes protégées
- **Authentification** : 5 tentatives par minute pour `/login` et `/register`
- **Réservations** : 10 réservations par minute
- **Paiements** : 5 tentatives par minute pour l'initiation et le traitement

### Configuration
Les limites sont configurées dans `routes/api.php` avec le middleware `throttle`.

## 2. Headers de Sécurité HTTP

### Middleware: `SecurityHeaders`
- **X-Content-Type-Options**: `nosniff` - Empêche le MIME-sniffing
- **X-Frame-Options**: `DENY` - Empêche le clickjacking
- **X-XSS-Protection**: `1; mode=block` - Protection XSS du navigateur
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Strict-Transport-Security**: HSTS activé en HTTPS
- **Content-Security-Policy**: Politique de sécurité du contenu

## 3. Logs de Sécurité

### Canal de logs: `security`
Tous les événements de sécurité sont enregistrés dans `storage/logs/security.log`:
- Tentatives de connexion (réussies et échouées)
- Tentatives d'inscription
- Accès aux routes sensibles
- Échecs d'authentification/autorisation
- Activités suspectes
- Uploads de fichiers rejetés

### Rétention: 90 jours

## 4. Protection contre les Attaques

### Force Brute
- Rate limiting sur les routes d'authentification
- Détection d'activités suspectes par IP
- Blocage automatique après 10 tentatives suspectes

### XSS (Cross-Site Scripting)
- Sanitization automatique des inputs
- Headers de sécurité HTTP
- Validation stricte des données

### SQL Injection
- Utilisation d'Eloquent ORM (protection native)
- Validation stricte des paramètres
- Requêtes préparées

### CSRF
- Protection Laravel native pour les routes web
- Tokens CSRF pour les formulaires

### File Upload
- Validation du type MIME
- Validation de l'extension
- Limitation de taille (5MB max)
- Validation du nom de fichier
- Middleware: `ValidateFileUpload`

## 5. Validation et Sanitization

### Service: `SecurityService`
- Sanitization des inputs
- Validation stricte des emails
- Validation des numéros de téléphone
- Détection d'activités suspectes

### Validation des Données
- Validation Laravel native
- Expressions régulières pour les formats
- Validation des types de fichiers

## 6. Chiffrement des Données Sensibles

### Trait: `EncryptsSensitiveData`
Permet de chiffrer/déchiffrer les données sensibles (PII):
- Numéros de pièce d'identité
- Informations bancaires
- Autres données personnelles

## 7. CORS (Cross-Origin Resource Sharing)

### Configuration sécurisée
- Origines autorisées limitées
- Méthodes HTTP limitées
- Headers autorisés limités
- Cache des pré-requêtes (1 heure)

## 8. Authentification et Autorisation

### Sanctum (API Tokens)
- Tokens Bearer pour l'authentification API
- Révocation des tokens au logout
- Vérification des permissions RBAC

### Vérifications
- Utilisateurs bloqués/inactifs ne peuvent pas se connecter
- Logs de toutes les tentatives de connexion
- Protection contre les attaques de timing

## 9. Gestion des Utilisateurs

### Sécurité des comptes
- Vérification du statut actif avant connexion
- Blocage des comptes inactifs
- Logs des tentatives d'accès aux comptes bloqués

## 10. Bonnes Pratiques Implémentées

1. **Principle of Least Privilege**: Accès minimal nécessaire
2. **Defense in Depth**: Plusieurs couches de sécurité
3. **Input Validation**: Validation stricte de toutes les entrées
4. **Output Encoding**: Encodage des sorties
5. **Error Handling**: Messages d'erreur génériques (pas de fuite d'infos)
6. **Audit Logging**: Logs complets de toutes les actions sensibles
7. **Secure Defaults**: Configuration sécurisée par défaut

## 11. Recommandations pour l'Audit

### Points à vérifier
1. Configuration des variables d'environnement
2. Rotation des clés de chiffrement
3. Monitoring des logs de sécurité
4. Tests de pénétration
5. Scan de vulnérabilités
6. Review du code
7. Configuration du serveur
8. Certificats SSL/TLS

### Outils recommandés
- OWASP ZAP pour les tests de sécurité
- SonarQube pour l'analyse de code
- Snyk pour les dépendances
- Burp Suite pour les tests de pénétration

## 12. Maintenance de Sécurité

### Actions régulières
- Review des logs de sécurité hebdomadaire
- Mise à jour des dépendances mensuelle
- Audit de sécurité trimestriel
- Rotation des clés annuelle

