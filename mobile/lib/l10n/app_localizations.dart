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

  /// No description provided for @loginNeedsOtp.
  ///
  /// In fr, this message translates to:
  /// **'Ce compte demande un code de vérification envoyé par e-mail. Cette étape n\'est pas encore disponible dans l\'application : connectez-vous une première fois depuis le site.'**
  String get loginNeedsOtp;

  /// No description provided for @loginNeedsTwoFactor.
  ///
  /// In fr, this message translates to:
  /// **'La double authentification de ce compte n\'est pas encore prise en charge dans l\'application. Connectez-vous depuis le site.'**
  String get loginNeedsTwoFactor;

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
