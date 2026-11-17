import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_fr.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('fr'),
  ];

  /// No description provided for @appName.
  ///
  /// In fr, this message translates to:
  /// **'boséjour'**
  String get appName;

  /// No description provided for @slogan.
  ///
  /// In fr, this message translates to:
  /// **'Votre séjour commence ici…'**
  String get slogan;

  /// No description provided for @navHome.
  ///
  /// In fr, this message translates to:
  /// **'Accueil'**
  String get navHome;

  /// No description provided for @navExplore.
  ///
  /// In fr, this message translates to:
  /// **'Explorer'**
  String get navExplore;

  /// No description provided for @navBookings.
  ///
  /// In fr, this message translates to:
  /// **'Réservations'**
  String get navBookings;

  /// No description provided for @navAccount.
  ///
  /// In fr, this message translates to:
  /// **'Compte'**
  String get navAccount;

  /// No description provided for @homeGreeting.
  ///
  /// In fr, this message translates to:
  /// **'Où allez-vous ?'**
  String get homeGreeting;

  /// No description provided for @homeSearchHint.
  ///
  /// In fr, this message translates to:
  /// **'Rechercher un hébergement, une ville…'**
  String get homeSearchHint;

  /// No description provided for @homeDestinations.
  ///
  /// In fr, this message translates to:
  /// **'Destinations populaires'**
  String get homeDestinations;

  /// No description provided for @homeDiscover.
  ///
  /// In fr, this message translates to:
  /// **'Hébergements à découvrir'**
  String get homeDiscover;

  /// No description provided for @homeFromPrice.
  ///
  /// In fr, this message translates to:
  /// **'dès {price} FCFA'**
  String homeFromPrice(String price);

  /// No description provided for @homeAccommodationsCount.
  ///
  /// In fr, this message translates to:
  /// **'{count, plural, =0{Aucun hébergement} =1{1 hébergement} other{{count} hébergements}}'**
  String homeAccommodationsCount(int count);

  /// No description provided for @exploreTitle.
  ///
  /// In fr, this message translates to:
  /// **'Explorer'**
  String get exploreTitle;

  /// No description provided for @exploreEmpty.
  ///
  /// In fr, this message translates to:
  /// **'Aucun hébergement ne correspond à votre recherche.'**
  String get exploreEmpty;

  /// No description provided for @explorePerNight.
  ///
  /// In fr, this message translates to:
  /// **'{price} FCFA / nuit'**
  String explorePerNight(String price);

  /// No description provided for @exploreReviews.
  ///
  /// In fr, this message translates to:
  /// **'{count, plural, =1{1 avis} other{{count} avis}}'**
  String exploreReviews(int count);

  /// No description provided for @bookingsTitle.
  ///
  /// In fr, this message translates to:
  /// **'Mes réservations'**
  String get bookingsTitle;

  /// No description provided for @bookingsLoginPrompt.
  ///
  /// In fr, this message translates to:
  /// **'Connectez-vous pour retrouver vos réservations.'**
  String get bookingsLoginPrompt;

  /// No description provided for @bookingsComingSoon.
  ///
  /// In fr, this message translates to:
  /// **'Le suivi de vos réservations arrive bientôt dans l\'application. En attendant, retrouvez-les sur le site.'**
  String get bookingsComingSoon;

  /// No description provided for @bookingsOpenSite.
  ///
  /// In fr, this message translates to:
  /// **'Ouvrir sur le site'**
  String get bookingsOpenSite;

  /// No description provided for @accountTitle.
  ///
  /// In fr, this message translates to:
  /// **'Mon compte'**
  String get accountTitle;

  /// No description provided for @accountLogout.
  ///
  /// In fr, this message translates to:
  /// **'Se déconnecter'**
  String get accountLogout;

  /// No description provided for @accountHelp.
  ///
  /// In fr, this message translates to:
  /// **'Centre d\'aide'**
  String get accountHelp;

  /// No description provided for @accountTerms.
  ///
  /// In fr, this message translates to:
  /// **'Conditions générales'**
  String get accountTerms;

  /// No description provided for @accountPrivacy.
  ///
  /// In fr, this message translates to:
  /// **'Politique de confidentialité'**
  String get accountPrivacy;

  /// No description provided for @accountVersion.
  ///
  /// In fr, this message translates to:
  /// **'Version {version}'**
  String accountVersion(String version);

  /// No description provided for @roleTraveler.
  ///
  /// In fr, this message translates to:
  /// **'Voyageur'**
  String get roleTraveler;

  /// No description provided for @roleHost.
  ///
  /// In fr, this message translates to:
  /// **'Partenaire'**
  String get roleHost;

  /// No description provided for @roleAdmin.
  ///
  /// In fr, this message translates to:
  /// **'Administrateur'**
  String get roleAdmin;

  /// No description provided for @loginTitle.
  ///
  /// In fr, this message translates to:
  /// **'Accéder à mon espace'**
  String get loginTitle;

  /// No description provided for @loginSubtitle.
  ///
  /// In fr, this message translates to:
  /// **'Connectez-vous pour réserver et suivre vos séjours.'**
  String get loginSubtitle;

  /// No description provided for @loginEmail.
  ///
  /// In fr, this message translates to:
  /// **'E-mail'**
  String get loginEmail;

  /// No description provided for @loginEmailHint.
  ///
  /// In fr, this message translates to:
  /// **'votre@email.com'**
  String get loginEmailHint;

  /// No description provided for @loginPassword.
  ///
  /// In fr, this message translates to:
  /// **'Mot de passe'**
  String get loginPassword;

  /// No description provided for @loginShowPassword.
  ///
  /// In fr, this message translates to:
  /// **'Afficher le mot de passe'**
  String get loginShowPassword;

  /// No description provided for @loginHidePassword.
  ///
  /// In fr, this message translates to:
  /// **'Masquer le mot de passe'**
  String get loginHidePassword;

  /// No description provided for @loginSubmit.
  ///
  /// In fr, this message translates to:
  /// **'Accéder à mon espace'**
  String get loginSubmit;

  /// No description provided for @loginForgot.
  ///
  /// In fr, this message translates to:
  /// **'Mot de passe oublié ?'**
  String get loginForgot;

  /// No description provided for @loginNoAccount.
  ///
  /// In fr, this message translates to:
  /// **'Pas encore de compte ?'**
  String get loginNoAccount;

  /// No description provided for @loginCreate.
  ///
  /// In fr, this message translates to:
  /// **'Créer mon espace'**
  String get loginCreate;

  /// No description provided for @loginEmailRequired.
  ///
  /// In fr, this message translates to:
  /// **'Saisissez votre e-mail.'**
  String get loginEmailRequired;

  /// No description provided for @loginEmailInvalid.
  ///
  /// In fr, this message translates to:
  /// **'Cette adresse e-mail n\'est pas valide.'**
  String get loginEmailInvalid;

  /// No description provided for @loginPasswordRequired.
  ///
  /// In fr, this message translates to:
  /// **'Saisissez votre mot de passe.'**
  String get loginPasswordRequired;

  /// No description provided for @retry.
  ///
  /// In fr, this message translates to:
  /// **'Réessayer'**
  String get retry;

  /// No description provided for @errorGeneric.
  ///
  /// In fr, this message translates to:
  /// **'Un problème est survenu. Réessayez dans un instant.'**
  String get errorGeneric;

  /// No description provided for @errorNetwork.
  ///
  /// In fr, this message translates to:
  /// **'Impossible de joindre boséjour. Vérifiez votre connexion internet.'**
  String get errorNetwork;

  /// No description provided for @errorSession.
  ///
  /// In fr, this message translates to:
  /// **'Votre session a expiré. Reconnectez-vous.'**
  String get errorSession;

  /// No description provided for @errorServer.
  ///
  /// In fr, this message translates to:
  /// **'Un problème est survenu de notre côté. Ce n\'est pas de votre faute : réessayez dans un instant.'**
  String get errorServer;

  /// No description provided for @errorTooMany.
  ///
  /// In fr, this message translates to:
  /// **'Trop de tentatives. Patientez un instant avant de réessayer.'**
  String get errorTooMany;

  /// No description provided for @typeHotel.
  ///
  /// In fr, this message translates to:
  /// **'Hôtel'**
  String get typeHotel;

  /// No description provided for @typeLodge.
  ///
  /// In fr, this message translates to:
  /// **'Écolodge'**
  String get typeLodge;

  /// No description provided for @typeGuesthouse.
  ///
  /// In fr, this message translates to:
  /// **'Maison d\'hôtes'**
  String get typeGuesthouse;

  /// No description provided for @typeApartment.
  ///
  /// In fr, this message translates to:
  /// **'Résidence'**
  String get typeApartment;

  /// No description provided for @typeOther.
  ///
  /// In fr, this message translates to:
  /// **'Hébergement'**
  String get typeOther;

  /// No description provided for @newBadge.
  ///
  /// In fr, this message translates to:
  /// **'Nouveau'**
  String get newBadge;

  /// No description provided for @detailBack.
  ///
  /// In fr, this message translates to:
  /// **'Retour'**
  String get detailBack;

  /// No description provided for @detailPhotoCounter.
  ///
  /// In fr, this message translates to:
  /// **'{current} / {total}'**
  String detailPhotoCounter(int current, int total);

  /// No description provided for @detailGuests.
  ///
  /// In fr, this message translates to:
  /// **'{count, plural, =1{1 voyageur} other{{count} voyageurs}}'**
  String detailGuests(int count);

  /// No description provided for @detailBedrooms.
  ///
  /// In fr, this message translates to:
  /// **'{count, plural, =1{1 chambre} other{{count} chambres}}'**
  String detailBedrooms(int count);

  /// No description provided for @detailBathrooms.
  ///
  /// In fr, this message translates to:
  /// **'{count, plural, =1{1 salle de bain} other{{count} salles de bain}}'**
  String detailBathrooms(int count);

  /// No description provided for @detailCheckIn.
  ///
  /// In fr, this message translates to:
  /// **'Arrivée dès {time}'**
  String detailCheckIn(String time);

  /// No description provided for @detailCheckOut.
  ///
  /// In fr, this message translates to:
  /// **'Départ avant {time}'**
  String detailCheckOut(String time);

  /// No description provided for @detailAbout.
  ///
  /// In fr, this message translates to:
  /// **'À propos'**
  String get detailAbout;

  /// No description provided for @detailReadMore.
  ///
  /// In fr, this message translates to:
  /// **'Lire la suite'**
  String get detailReadMore;

  /// No description provided for @detailReadLess.
  ///
  /// In fr, this message translates to:
  /// **'Réduire'**
  String get detailReadLess;

  /// No description provided for @detailAmenities.
  ///
  /// In fr, this message translates to:
  /// **'Équipements et services'**
  String get detailAmenities;

  /// No description provided for @detailRooms.
  ///
  /// In fr, this message translates to:
  /// **'Chambres'**
  String get detailRooms;

  /// No description provided for @detailFromPerNight.
  ///
  /// In fr, this message translates to:
  /// **'dès {price} FCFA / nuit'**
  String detailFromPerNight(String price);

  /// No description provided for @detailPolicies.
  ///
  /// In fr, this message translates to:
  /// **'Réservation et paiement'**
  String get detailPolicies;

  /// No description provided for @detailCancelStrict.
  ///
  /// In fr, this message translates to:
  /// **'Annulation stricte : réservation non remboursable, aucune annulation gratuite.'**
  String get detailCancelStrict;

  /// No description provided for @detailCancelModerate.
  ///
  /// In fr, this message translates to:
  /// **'Annulation modérée : gratuite jusqu\'à {hours} h avant l\'arrivée. Passé ce délai, 50 % sont conservés et 50 % vous sont rendus en avoir.'**
  String detailCancelModerate(int hours);

  /// No description provided for @detailCancelFlexible.
  ///
  /// In fr, this message translates to:
  /// **'Annulation flexible : gratuite jusqu\'à {hours} h avant l\'arrivée. Ensuite, la garantie est transformée en avoir.'**
  String detailCancelFlexible(int hours);

  /// No description provided for @detailSpecialConditions.
  ///
  /// In fr, this message translates to:
  /// **'Conditions particulières'**
  String get detailSpecialConditions;

  /// No description provided for @detailReviews.
  ///
  /// In fr, this message translates to:
  /// **'Avis des voyageurs'**
  String get detailReviews;

  /// No description provided for @detailNoReviews.
  ///
  /// In fr, this message translates to:
  /// **'Pas encore d\'avis : cet établissement vient d\'arriver sur boséjour.'**
  String get detailNoReviews;

  /// No description provided for @detailHostReply.
  ///
  /// In fr, this message translates to:
  /// **'Réponse de l\'établissement'**
  String get detailHostReply;

  /// No description provided for @detailViewMap.
  ///
  /// In fr, this message translates to:
  /// **'Voir sur la carte'**
  String get detailViewMap;

  /// No description provided for @detailBook.
  ///
  /// In fr, this message translates to:
  /// **'Réserver'**
  String get detailBook;

  /// No description provided for @detailServiceReception24h.
  ///
  /// In fr, this message translates to:
  /// **'Réception 24 h/24'**
  String get detailServiceReception24h;

  /// No description provided for @detailServiceShuttle.
  ///
  /// In fr, this message translates to:
  /// **'Navette'**
  String get detailServiceShuttle;

  /// No description provided for @detailServiceLaundry.
  ///
  /// In fr, this message translates to:
  /// **'Blanchisserie'**
  String get detailServiceLaundry;

  /// No description provided for @detailServicePets.
  ///
  /// In fr, this message translates to:
  /// **'Animaux acceptés'**
  String get detailServicePets;

  /// No description provided for @detailServiceSmoking.
  ///
  /// In fr, this message translates to:
  /// **'Espace fumeur'**
  String get detailServiceSmoking;

  /// No description provided for @detailServiceBreakfast.
  ///
  /// In fr, this message translates to:
  /// **'Petit-déjeuner inclus'**
  String get detailServiceBreakfast;

  /// No description provided for @detailNotFound.
  ///
  /// In fr, this message translates to:
  /// **'Cet établissement n\'est plus disponible.'**
  String get detailNotFound;

  /// No description provided for @detailStars.
  ///
  /// In fr, this message translates to:
  /// **'{count} étoiles'**
  String detailStars(int count);

  /// No description provided for @registerTitle.
  ///
  /// In fr, this message translates to:
  /// **'Créer mon espace'**
  String get registerTitle;

  /// No description provided for @registerSubtitle.
  ///
  /// In fr, this message translates to:
  /// **'Réservez, suivez vos paiements et cumulez des points au même endroit.'**
  String get registerSubtitle;

  /// No description provided for @registerTypeIndividual.
  ///
  /// In fr, this message translates to:
  /// **'Individuel'**
  String get registerTypeIndividual;

  /// No description provided for @registerTypeIndividualSub.
  ///
  /// In fr, this message translates to:
  /// **'Pour mes voyages personnels'**
  String get registerTypeIndividualSub;

  /// No description provided for @registerTypeCorporate.
  ///
  /// In fr, this message translates to:
  /// **'Entreprise'**
  String get registerTypeCorporate;

  /// No description provided for @registerTypeCorporateSub.
  ///
  /// In fr, this message translates to:
  /// **'Déplacements professionnels, facture au nom de la société'**
  String get registerTypeCorporateSub;

  /// No description provided for @registerCompany.
  ///
  /// In fr, this message translates to:
  /// **'Société'**
  String get registerCompany;

  /// No description provided for @registerCompanyRequired.
  ///
  /// In fr, this message translates to:
  /// **'Saisissez le nom de la société.'**
  String get registerCompanyRequired;

  /// No description provided for @registerFirstName.
  ///
  /// In fr, this message translates to:
  /// **'Prénom'**
  String get registerFirstName;

  /// No description provided for @registerLastName.
  ///
  /// In fr, this message translates to:
  /// **'Nom'**
  String get registerLastName;

  /// No description provided for @registerNameRequired.
  ///
  /// In fr, this message translates to:
  /// **'Champ obligatoire.'**
  String get registerNameRequired;

  /// No description provided for @registerPhone.
  ///
  /// In fr, this message translates to:
  /// **'Téléphone'**
  String get registerPhone;

  /// No description provided for @registerPhoneHint.
  ///
  /// In fr, this message translates to:
  /// **'07 07 00 00 00'**
  String get registerPhoneHint;

  /// No description provided for @registerPhoneInvalid.
  ///
  /// In fr, this message translates to:
  /// **'Ce numéro n\'est pas valide.'**
  String get registerPhoneInvalid;

  /// No description provided for @registerPasswordHint.
  ///
  /// In fr, this message translates to:
  /// **'8 caractères minimum'**
  String get registerPasswordHint;

  /// No description provided for @registerPasswordTooShort.
  ///
  /// In fr, this message translates to:
  /// **'8 caractères minimum.'**
  String get registerPasswordTooShort;

  /// No description provided for @registerReferral.
  ///
  /// In fr, this message translates to:
  /// **'Code d\'invitation (facultatif)'**
  String get registerReferral;

  /// No description provided for @registerReferralPartner.
  ///
  /// In fr, this message translates to:
  /// **'Invitation de {name} : −{percent} % sur votre première réservation'**
  String registerReferralPartner(String name, String percent);

  /// No description provided for @registerReferralKnown.
  ///
  /// In fr, this message translates to:
  /// **'Code reconnu : il sera appliqué à votre inscription.'**
  String get registerReferralKnown;

  /// No description provided for @registerReferralUnknown.
  ///
  /// In fr, this message translates to:
  /// **'Ce code n\'existe pas.'**
  String get registerReferralUnknown;

  /// No description provided for @registerAcceptPrefix.
  ///
  /// In fr, this message translates to:
  /// **'J\'accepte les '**
  String get registerAcceptPrefix;

  /// No description provided for @registerAcceptAnd.
  ///
  /// In fr, this message translates to:
  /// **' et la '**
  String get registerAcceptAnd;

  /// No description provided for @registerTermsLink.
  ///
  /// In fr, this message translates to:
  /// **'conditions générales'**
  String get registerTermsLink;

  /// No description provided for @registerPrivacyLink.
  ///
  /// In fr, this message translates to:
  /// **'politique de confidentialité'**
  String get registerPrivacyLink;

  /// No description provided for @registerTermsRequired.
  ///
  /// In fr, this message translates to:
  /// **'Acceptez les conditions pour continuer.'**
  String get registerTermsRequired;

  /// No description provided for @registerSubmit.
  ///
  /// In fr, this message translates to:
  /// **'Recevoir mon code'**
  String get registerSubmit;

  /// No description provided for @registerHaveAccount.
  ///
  /// In fr, this message translates to:
  /// **'Déjà un compte ?'**
  String get registerHaveAccount;

  /// No description provided for @registerLogin.
  ///
  /// In fr, this message translates to:
  /// **'Me connecter'**
  String get registerLogin;

  /// No description provided for @otpTitle.
  ///
  /// In fr, this message translates to:
  /// **'Entrez le code reçu'**
  String get otpTitle;

  /// No description provided for @otpSubtitle.
  ///
  /// In fr, this message translates to:
  /// **'Envoyé à {email}, et par SMS si un numéro est enregistré. Il est valable 10 minutes.'**
  String otpSubtitle(String email);

  /// No description provided for @otpResend.
  ///
  /// In fr, this message translates to:
  /// **'Renvoyer le code'**
  String get otpResend;

  /// No description provided for @otpResendIn.
  ///
  /// In fr, this message translates to:
  /// **'Renvoyer dans {seconds} s'**
  String otpResendIn(String seconds);

  /// No description provided for @otpResent.
  ///
  /// In fr, this message translates to:
  /// **'Un nouveau code vient d\'être envoyé.'**
  String get otpResent;

  /// No description provided for @twoFaTitle.
  ///
  /// In fr, this message translates to:
  /// **'Double authentification'**
  String get twoFaTitle;

  /// No description provided for @twoFaSubtitle.
  ///
  /// In fr, this message translates to:
  /// **'Saisissez le code à 6 chiffres de votre application d\'authentification.'**
  String get twoFaSubtitle;

  /// No description provided for @twoFaUseRecovery.
  ///
  /// In fr, this message translates to:
  /// **'Utiliser un code de secours'**
  String get twoFaUseRecovery;

  /// No description provided for @twoFaUseCode.
  ///
  /// In fr, this message translates to:
  /// **'Utiliser le code de l\'application'**
  String get twoFaUseCode;

  /// No description provided for @twoFaRecoveryHint.
  ///
  /// In fr, this message translates to:
  /// **'Code de secours (8 caractères)'**
  String get twoFaRecoveryHint;

  /// No description provided for @twoFaSubmit.
  ///
  /// In fr, this message translates to:
  /// **'Valider'**
  String get twoFaSubmit;

  /// No description provided for @forgotTitle.
  ///
  /// In fr, this message translates to:
  /// **'Mot de passe oublié'**
  String get forgotTitle;

  /// No description provided for @forgotSubtitle.
  ///
  /// In fr, this message translates to:
  /// **'Indiquez votre e-mail : nous vous envoyons un lien pour en choisir un nouveau.'**
  String get forgotSubtitle;

  /// No description provided for @forgotSubmit.
  ///
  /// In fr, this message translates to:
  /// **'Envoyer le lien'**
  String get forgotSubmit;

  /// No description provided for @forgotSent.
  ///
  /// In fr, this message translates to:
  /// **'Lien envoyé. Vérifiez votre boîte de réception et vos courriers indésirables.'**
  String get forgotSent;

  /// No description provided for @forgotBack.
  ///
  /// In fr, this message translates to:
  /// **'Retour à la connexion'**
  String get forgotBack;

  /// No description provided for @welcomeTitle.
  ///
  /// In fr, this message translates to:
  /// **'Bienvenue, {name} !'**
  String welcomeTitle(String name);

  /// No description provided for @welcomeSubtitle.
  ///
  /// In fr, this message translates to:
  /// **'Votre espace est prêt.'**
  String get welcomeSubtitle;

  /// No description provided for @welcomeDiscount.
  ///
  /// In fr, this message translates to:
  /// **'−{percent} % sur votre première réservation'**
  String welcomeDiscount(String percent);

  /// No description provided for @welcomeDiscountSub.
  ///
  /// In fr, this message translates to:
  /// **'Invitation appliquée automatiquement'**
  String get welcomeDiscountSub;

  /// No description provided for @welcomeCta.
  ///
  /// In fr, this message translates to:
  /// **'Découvrir les séjours'**
  String get welcomeCta;

  /// No description provided for @authBack.
  ///
  /// In fr, this message translates to:
  /// **'Retour'**
  String get authBack;

  /// No description provided for @boLauncher.
  ///
  /// In fr, this message translates to:
  /// **'Demandez à Bo'**
  String get boLauncher;

  /// No description provided for @boLauncherHint.
  ///
  /// In fr, this message translates to:
  /// **'Une question ?'**
  String get boLauncherHint;

  /// No description provided for @boName.
  ///
  /// In fr, this message translates to:
  /// **'Bo'**
  String get boName;

  /// No description provided for @boSubtitle.
  ///
  /// In fr, this message translates to:
  /// **'Assistant boséjour'**
  String get boSubtitle;

  /// No description provided for @boHello.
  ///
  /// In fr, this message translates to:
  /// **'Bonjour !'**
  String get boHello;

  /// No description provided for @boIntroTitle.
  ///
  /// In fr, this message translates to:
  /// **'Je suis Bo, votre assistant de séjour'**
  String get boIntroTitle;

  /// No description provided for @boIntroText.
  ///
  /// In fr, this message translates to:
  /// **'Dites-moi où, quand et pour combien de personnes : je trouve, je compare et je prépare votre réservation, partout en Côte d\'Ivoire.'**
  String get boIntroText;

  /// No description provided for @boTileHotel.
  ///
  /// In fr, this message translates to:
  /// **'Un hôtel à Abidjan'**
  String get boTileHotel;

  /// No description provided for @boTileHotelQuestion.
  ///
  /// In fr, this message translates to:
  /// **'Je cherche un hôtel à Abidjan'**
  String get boTileHotelQuestion;

  /// No description provided for @boTileWeekend.
  ///
  /// In fr, this message translates to:
  /// **'Un week-end à Assinie'**
  String get boTileWeekend;

  /// No description provided for @boTileWeekendQuestion.
  ///
  /// In fr, this message translates to:
  /// **'Je cherche un hébergement pour un week-end à Assinie'**
  String get boTileWeekendQuestion;

  /// No description provided for @boTileResidence.
  ///
  /// In fr, this message translates to:
  /// **'Une résidence meublée'**
  String get boTileResidence;

  /// No description provided for @boTileResidenceQuestion.
  ///
  /// In fr, this message translates to:
  /// **'Je cherche une résidence meublée'**
  String get boTileResidenceQuestion;

  /// No description provided for @boTileBookings.
  ///
  /// In fr, this message translates to:
  /// **'Suivre ma réservation'**
  String get boTileBookings;

  /// No description provided for @boTileBookingsQuestion.
  ///
  /// In fr, this message translates to:
  /// **'Où en sont mes réservations ?'**
  String get boTileBookingsQuestion;

  /// No description provided for @boInputHint.
  ///
  /// In fr, this message translates to:
  /// **'Demandez à Bo'**
  String get boInputHint;

  /// No description provided for @boSend.
  ///
  /// In fr, this message translates to:
  /// **'Envoyer'**
  String get boSend;

  /// No description provided for @boNewChat.
  ///
  /// In fr, this message translates to:
  /// **'Nouvelle conversation'**
  String get boNewChat;

  /// No description provided for @boToday.
  ///
  /// In fr, this message translates to:
  /// **'Aujourd\'hui · {time}'**
  String boToday(String time);

  /// No description provided for @boChoice.
  ///
  /// In fr, this message translates to:
  /// **'Choix de Bo'**
  String get boChoice;

  /// No description provided for @boPriceOnPage.
  ///
  /// In fr, this message translates to:
  /// **'Tarif sur la fiche'**
  String get boPriceOnPage;

  /// No description provided for @boView.
  ///
  /// In fr, this message translates to:
  /// **'Voir'**
  String get boView;

  /// No description provided for @boLoginRequired.
  ///
  /// In fr, this message translates to:
  /// **'Connectez-vous à votre espace voyageur pour discuter avec Bo.'**
  String get boLoginRequired;

  /// No description provided for @boLogin.
  ///
  /// In fr, this message translates to:
  /// **'Me connecter'**
  String get boLogin;

  /// No description provided for @boErrorTooFast.
  ///
  /// In fr, this message translates to:
  /// **'Vous posez des questions un peu vite. Patientez une minute, puis réessayez.'**
  String get boErrorTooFast;

  /// No description provided for @boErrorGeneric.
  ///
  /// In fr, this message translates to:
  /// **'Bo n\'a pas pu répondre. Vérifiez votre connexion, puis réessayez.'**
  String get boErrorGeneric;

  /// No description provided for @boClose.
  ///
  /// In fr, this message translates to:
  /// **'Fermer la conversation avec Bo'**
  String get boClose;

  /// No description provided for @bookTitle.
  ///
  /// In fr, this message translates to:
  /// **'Réserver'**
  String get bookTitle;

  /// No description provided for @bookStepOf.
  ///
  /// In fr, this message translates to:
  /// **'Étape {step} sur {total}'**
  String bookStepOf(String step, String total);

  /// No description provided for @bookGateTitle.
  ///
  /// In fr, this message translates to:
  /// **'Connectez-vous pour réserver'**
  String get bookGateTitle;

  /// No description provided for @bookGateText.
  ///
  /// In fr, this message translates to:
  /// **'Votre demande est suivie dans « Mes réservations » : l\'hôte répond, puis vous payez, le tout depuis l\'appli.'**
  String get bookGateText;

  /// No description provided for @bookStayTitle.
  ///
  /// In fr, this message translates to:
  /// **'Votre séjour'**
  String get bookStayTitle;

  /// No description provided for @bookStaySubtitle.
  ///
  /// In fr, this message translates to:
  /// **'Vérifiez les dates et le nombre de voyageurs.'**
  String get bookStaySubtitle;

  /// No description provided for @bookDates.
  ///
  /// In fr, this message translates to:
  /// **'Dates'**
  String get bookDates;

  /// No description provided for @bookDatesPick.
  ///
  /// In fr, this message translates to:
  /// **'Choisir les dates'**
  String get bookDatesPick;

  /// No description provided for @bookDatesValue.
  ///
  /// In fr, this message translates to:
  /// **'{from} → {to} · {nights, plural, =1{1 nuit} other{{nights} nuits}}'**
  String bookDatesValue(String from, String to, int nights);

  /// No description provided for @bookGuests.
  ///
  /// In fr, this message translates to:
  /// **'Voyageurs'**
  String get bookGuests;

  /// No description provided for @bookAdults.
  ///
  /// In fr, this message translates to:
  /// **'Adultes'**
  String get bookAdults;

  /// No description provided for @bookChildren.
  ///
  /// In fr, this message translates to:
  /// **'Enfants'**
  String get bookChildren;

  /// No description provided for @bookRoom.
  ///
  /// In fr, this message translates to:
  /// **'Chambre'**
  String get bookRoom;

  /// No description provided for @bookRoomCapacity.
  ///
  /// In fr, this message translates to:
  /// **'{count, plural, =1{1 personne} other{{count} personnes}}'**
  String bookRoomCapacity(int count);

  /// No description provided for @bookTooManyGuests.
  ///
  /// In fr, this message translates to:
  /// **'Cette chambre accueille {max} personnes au maximum.'**
  String bookTooManyGuests(String max);

  /// No description provided for @bookWhoTitle.
  ///
  /// In fr, this message translates to:
  /// **'Qui voyage ?'**
  String get bookWhoTitle;

  /// No description provided for @bookWhoSubtitle.
  ///
  /// In fr, this message translates to:
  /// **'Le nom doit correspondre à une pièce d\'identité présentée à l\'arrivée.'**
  String get bookWhoSubtitle;

  /// No description provided for @bookWhoMe.
  ///
  /// In fr, this message translates to:
  /// **'Moi-même'**
  String get bookWhoMe;

  /// No description provided for @bookWhoOther.
  ///
  /// In fr, this message translates to:
  /// **'Une autre personne'**
  String get bookWhoOther;

  /// No description provided for @bookWhoOtherSub.
  ///
  /// In fr, this message translates to:
  /// **'Je réserve pour quelqu\'un d\'autre'**
  String get bookWhoOtherSub;

  /// No description provided for @bookTravelerName.
  ///
  /// In fr, this message translates to:
  /// **'Nom du voyageur principal'**
  String get bookTravelerName;

  /// No description provided for @bookTravelerPhone.
  ///
  /// In fr, this message translates to:
  /// **'Téléphone du voyageur'**
  String get bookTravelerPhone;

  /// No description provided for @bookPhone.
  ///
  /// In fr, this message translates to:
  /// **'Votre téléphone (messages de la réservation)'**
  String get bookPhone;

  /// No description provided for @bookCountry.
  ///
  /// In fr, this message translates to:
  /// **'Pays de résidence'**
  String get bookCountry;

  /// No description provided for @bookCountryDefault.
  ///
  /// In fr, this message translates to:
  /// **'Côte d\'Ivoire'**
  String get bookCountryDefault;

  /// No description provided for @bookArrival.
  ///
  /// In fr, this message translates to:
  /// **'Heure d\'arrivée prévue (facultatif)'**
  String get bookArrival;

  /// No description provided for @bookArrivalNone.
  ///
  /// In fr, this message translates to:
  /// **'Je ne sais pas encore'**
  String get bookArrivalNone;

  /// No description provided for @bookRequests.
  ///
  /// In fr, this message translates to:
  /// **'Demande particulière (facultatif)'**
  String get bookRequests;

  /// No description provided for @bookFieldRequired.
  ///
  /// In fr, this message translates to:
  /// **'Champ obligatoire.'**
  String get bookFieldRequired;

  /// No description provided for @bookSummaryTitle.
  ///
  /// In fr, this message translates to:
  /// **'Récapitulatif'**
  String get bookSummaryTitle;

  /// No description provided for @bookSummarySubtitle.
  ///
  /// In fr, this message translates to:
  /// **'Vous ne payez rien maintenant : l\'hôte confirme d\'abord.'**
  String get bookSummarySubtitle;

  /// No description provided for @bookStayLine.
  ///
  /// In fr, this message translates to:
  /// **'{price} × {nights, plural, =1{1 nuit} other{{nights} nuits}}'**
  String bookStayLine(String price, int nights);

  /// No description provided for @bookTotal.
  ///
  /// In fr, this message translates to:
  /// **'Total'**
  String get bookTotal;

  /// No description provided for @bookReferralCode.
  ///
  /// In fr, this message translates to:
  /// **'Code d\'invitation'**
  String get bookReferralCode;

  /// No description provided for @bookReferralApply.
  ///
  /// In fr, this message translates to:
  /// **'Appliquer'**
  String get bookReferralApply;

  /// No description provided for @bookReferralApplied.
  ///
  /// In fr, this message translates to:
  /// **'Invitation de {name} : −{amount} FCFA'**
  String bookReferralApplied(String name, String amount);

  /// No description provided for @bookPayNowFull.
  ///
  /// In fr, this message translates to:
  /// **'Payer tout de suite : {amount} FCFA (−{percent} %)'**
  String bookPayNowFull(String amount, String percent);

  /// No description provided for @bookPayGuarantee.
  ///
  /// In fr, this message translates to:
  /// **'Ou garantir la chambre : {amount} FCFA, le solde à l\'arrivée'**
  String bookPayGuarantee(String amount);

  /// No description provided for @bookPayFullOnly.
  ///
  /// In fr, this message translates to:
  /// **'Paiement intégral : {amount} FCFA'**
  String bookPayFullOnly(String amount);

  /// No description provided for @bookPayLater.
  ///
  /// In fr, this message translates to:
  /// **'Après la confirmation de l\'hôte, vous choisissez comment payer :'**
  String get bookPayLater;

  /// No description provided for @bookSubmit.
  ///
  /// In fr, this message translates to:
  /// **'Envoyer ma demande'**
  String get bookSubmit;

  /// No description provided for @bookNext.
  ///
  /// In fr, this message translates to:
  /// **'Continuer'**
  String get bookNext;

  /// No description provided for @bookQuoteError.
  ///
  /// In fr, this message translates to:
  /// **'Impossible de calculer le prix pour ces dates.'**
  String get bookQuoteError;

  /// No description provided for @bookSentTitle.
  ///
  /// In fr, this message translates to:
  /// **'Demande envoyée !'**
  String get bookSentTitle;

  /// No description provided for @bookSentText.
  ///
  /// In fr, this message translates to:
  /// **'{host} a 24 h pour répondre. Vous êtes prévenu par notification et WhatsApp, avec votre lien de paiement.'**
  String bookSentText(String host);

  /// No description provided for @bookSentHostFallback.
  ///
  /// In fr, this message translates to:
  /// **'L\'hôte'**
  String get bookSentHostFallback;

  /// No description provided for @bookSentStep1.
  ///
  /// In fr, this message translates to:
  /// **'Demande envoyée'**
  String get bookSentStep1;

  /// No description provided for @bookSentStep2.
  ///
  /// In fr, this message translates to:
  /// **'Réponse de l\'hôte'**
  String get bookSentStep2;

  /// No description provided for @bookSentStep2Sub.
  ///
  /// In fr, this message translates to:
  /// **'Jusqu\'à 24 h pour répondre'**
  String get bookSentStep2Sub;

  /// No description provided for @bookSentStep3.
  ///
  /// In fr, this message translates to:
  /// **'Paiement'**
  String get bookSentStep3;

  /// No description provided for @bookSentStep3Sub.
  ///
  /// In fr, this message translates to:
  /// **'Après confirmation, depuis l\'appli'**
  String get bookSentStep3Sub;

  /// No description provided for @bookSentStep4.
  ///
  /// In fr, this message translates to:
  /// **'Code d\'arrivée'**
  String get bookSentStep4;

  /// No description provided for @bookSentStep4Sub.
  ///
  /// In fr, this message translates to:
  /// **'Reçu dès le paiement confirmé'**
  String get bookSentStep4Sub;

  /// No description provided for @bookSentBookings.
  ///
  /// In fr, this message translates to:
  /// **'Mes réservations'**
  String get bookSentBookings;

  /// No description provided for @bookSentHome.
  ///
  /// In fr, this message translates to:
  /// **'Retour à l\'accueil'**
  String get bookSentHome;

  /// No description provided for @welcomeContinue.
  ///
  /// In fr, this message translates to:
  /// **'Continuer ma réservation'**
  String get welcomeContinue;

  /// No description provided for @authLoginTitle.
  ///
  /// In fr, this message translates to:
  /// **'Connexion'**
  String get authLoginTitle;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'fr'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'fr':
      return AppLocalizationsFr();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
