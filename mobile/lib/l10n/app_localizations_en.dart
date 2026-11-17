// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'boséjour';

  @override
  String get slogan => 'Your stay starts here…';

  @override
  String get navHome => 'Home';

  @override
  String get navExplore => 'Explore';

  @override
  String get navBookings => 'Bookings';

  @override
  String get navAccount => 'Account';

  @override
  String get homeGreeting => 'Where to?';

  @override
  String get homeSearchHint => 'Search a stay, a city…';

  @override
  String get homeDestinations => 'Popular destinations';

  @override
  String get homeDiscover => 'Stays to discover';

  @override
  String homeFromPrice(String price) {
    return 'from $price FCFA';
  }

  @override
  String homeAccommodationsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count stays',
      one: '1 stay',
      zero: 'No stays',
    );
    return '$_temp0';
  }

  @override
  String get exploreTitle => 'Explore';

  @override
  String get exploreEmpty => 'No stay matches your search.';

  @override
  String explorePerNight(String price) {
    return '$price FCFA / night';
  }

  @override
  String exploreReviews(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count reviews',
      one: '1 review',
    );
    return '$_temp0';
  }

  @override
  String get bookingsTitle => 'My bookings';

  @override
  String get bookingsLoginPrompt => 'Sign in to find your bookings.';

  @override
  String get bookingsComingSoon =>
      'Booking tracking is coming soon to the app. Meanwhile, find them on the website.';

  @override
  String get bookingsOpenSite => 'Open on the website';

  @override
  String get accountTitle => 'My account';

  @override
  String get accountLogout => 'Sign out';

  @override
  String get accountHelp => 'Help center';

  @override
  String get accountTerms => 'Terms and conditions';

  @override
  String get accountPrivacy => 'Privacy policy';

  @override
  String accountVersion(String version) {
    return 'Version $version';
  }

  @override
  String get roleTraveler => 'Traveler';

  @override
  String get roleHost => 'Host';

  @override
  String get roleAdmin => 'Administrator';

  @override
  String get loginTitle => 'Access my space';

  @override
  String get loginSubtitle => 'Sign in to book and follow your stays.';

  @override
  String get loginEmail => 'Email';

  @override
  String get loginEmailHint => 'you@email.com';

  @override
  String get loginPassword => 'Password';

  @override
  String get loginShowPassword => 'Show password';

  @override
  String get loginHidePassword => 'Hide password';

  @override
  String get loginSubmit => 'Access my space';

  @override
  String get loginForgot => 'Forgot your password?';

  @override
  String get loginNoAccount => 'No account yet?';

  @override
  String get loginCreate => 'Create my space';

  @override
  String get loginEmailRequired => 'Enter your email.';

  @override
  String get loginEmailInvalid => 'This email address is not valid.';

  @override
  String get loginPasswordRequired => 'Enter your password.';

  @override
  String get retry => 'Try again';

  @override
  String get errorGeneric =>
      'Something went wrong. Please try again in a moment.';

  @override
  String get errorNetwork =>
      'Unable to reach boséjour. Check your internet connection.';

  @override
  String get errorSession => 'Your session has expired. Please sign in again.';

  @override
  String get errorServer =>
      'Something went wrong on our side. It\'s not your fault: please try again in a moment.';

  @override
  String get errorTooMany =>
      'Too many attempts. Please wait a moment before trying again.';

  @override
  String get typeHotel => 'Hotel';

  @override
  String get typeLodge => 'Eco-lodge';

  @override
  String get typeGuesthouse => 'Guesthouse';

  @override
  String get typeApartment => 'Residence';

  @override
  String get typeOther => 'Stay';

  @override
  String get newBadge => 'New';

  @override
  String get detailBack => 'Back';

  @override
  String detailPhotoCounter(int current, int total) {
    return '$current / $total';
  }

  @override
  String detailGuests(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count guests',
      one: '1 guest',
    );
    return '$_temp0';
  }

  @override
  String detailBedrooms(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count bedrooms',
      one: '1 bedroom',
    );
    return '$_temp0';
  }

  @override
  String detailBathrooms(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count bathrooms',
      one: '1 bathroom',
    );
    return '$_temp0';
  }

  @override
  String detailCheckIn(String time) {
    return 'Check-in from $time';
  }

  @override
  String detailCheckOut(String time) {
    return 'Check-out before $time';
  }

  @override
  String get detailAbout => 'About';

  @override
  String get detailReadMore => 'Read more';

  @override
  String get detailReadLess => 'Show less';

  @override
  String get detailAmenities => 'Amenities and services';

  @override
  String get detailRooms => 'Rooms';

  @override
  String detailFromPerNight(String price) {
    return 'from $price FCFA / night';
  }

  @override
  String get detailPolicies => 'Booking and payment';

  @override
  String get detailCancelStrict =>
      'Strict cancellation: non-refundable booking, no free cancellation.';

  @override
  String detailCancelModerate(int hours) {
    return 'Moderate cancellation: free up to $hours h before arrival. After that, 50% is kept and 50% is returned as credit.';
  }

  @override
  String detailCancelFlexible(int hours) {
    return 'Flexible cancellation: free up to $hours h before arrival. After that, the guarantee is turned into credit.';
  }

  @override
  String get detailSpecialConditions => 'Special conditions';

  @override
  String get detailReviews => 'Guest reviews';

  @override
  String get detailNoReviews =>
      'No reviews yet: this place has just joined boséjour.';

  @override
  String get detailHostReply => 'Reply from the property';

  @override
  String get detailViewMap => 'View on map';

  @override
  String get detailBook => 'Book';

  @override
  String get detailServiceReception24h => '24-hour front desk';

  @override
  String get detailServiceShuttle => 'Shuttle';

  @override
  String get detailServiceLaundry => 'Laundry';

  @override
  String get detailServicePets => 'Pets allowed';

  @override
  String get detailServiceSmoking => 'Smoking area';

  @override
  String get detailServiceBreakfast => 'Breakfast included';

  @override
  String get detailNotFound => 'This place is no longer available.';

  @override
  String detailStars(int count) {
    return '$count stars';
  }

  @override
  String get registerTitle => 'Create my account';

  @override
  String get registerSubtitle =>
      'Book, track your payments and earn points in one place.';

  @override
  String get registerTypeIndividual => 'Individual';

  @override
  String get registerTypeIndividualSub => 'For my personal trips';

  @override
  String get registerTypeCorporate => 'Company';

  @override
  String get registerTypeCorporateSub =>
      'Business travel, invoice in the company\'s name';

  @override
  String get registerCompany => 'Company name';

  @override
  String get registerCompanyRequired => 'Enter the company name.';

  @override
  String get registerFirstName => 'First name';

  @override
  String get registerLastName => 'Last name';

  @override
  String get registerNameRequired => 'Required field.';

  @override
  String get registerPhone => 'Phone';

  @override
  String get registerPhoneHint => '07 07 00 00 00';

  @override
  String get registerPhoneInvalid => 'This number is not valid.';

  @override
  String get registerPasswordHint => 'At least 8 characters';

  @override
  String get registerPasswordTooShort => 'At least 8 characters.';

  @override
  String get registerReferral => 'Invitation code (optional)';

  @override
  String registerReferralPartner(String name, String percent) {
    return 'Invitation from $name: $percent% off your first booking';
  }

  @override
  String get registerReferralKnown =>
      'Code recognised: it will be applied to your sign-up.';

  @override
  String get registerReferralUnknown => 'This code does not exist.';

  @override
  String get registerAcceptPrefix => 'I accept the ';

  @override
  String get registerAcceptAnd => ' and the ';

  @override
  String get registerTermsLink => 'terms and conditions';

  @override
  String get registerPrivacyLink => 'privacy policy';

  @override
  String get registerTermsRequired => 'Accept the terms to continue.';

  @override
  String get registerSubmit => 'Get my code';

  @override
  String get registerHaveAccount => 'Already have an account?';

  @override
  String get registerLogin => 'Log in';

  @override
  String get otpTitle => 'Enter the code you received';

  @override
  String otpSubtitle(String email) {
    return 'Sent to $email, and by SMS if a number is on file. It is valid for 10 minutes.';
  }

  @override
  String get otpResend => 'Resend the code';

  @override
  String otpResendIn(String seconds) {
    return 'Resend in $seconds s';
  }

  @override
  String get otpResent => 'A new code has been sent.';

  @override
  String get twoFaTitle => 'Two-step verification';

  @override
  String get twoFaSubtitle =>
      'Enter the 6-digit code from your authenticator app.';

  @override
  String get twoFaUseRecovery => 'Use a recovery code';

  @override
  String get twoFaUseCode => 'Use the app code';

  @override
  String get twoFaRecoveryHint => 'Recovery code (8 characters)';

  @override
  String get twoFaSubmit => 'Confirm';

  @override
  String get forgotTitle => 'Forgot password';

  @override
  String get forgotSubtitle =>
      'Enter your e-mail: we\'ll send you a link to choose a new one.';

  @override
  String get forgotSubmit => 'Send the link';

  @override
  String get forgotSent => 'Link sent. Check your inbox and your spam folder.';

  @override
  String get forgotBack => 'Back to log in';

  @override
  String welcomeTitle(String name) {
    return 'Welcome, $name!';
  }

  @override
  String get welcomeSubtitle => 'Your account is ready.';

  @override
  String welcomeDiscount(String percent) {
    return '$percent% off your first booking';
  }

  @override
  String get welcomeDiscountSub => 'Invitation applied automatically';

  @override
  String get welcomeCta => 'Discover stays';

  @override
  String get authBack => 'Back';

  @override
  String get boLauncher => 'Ask Bo';

  @override
  String get boLauncherHint => 'Got a question?';

  @override
  String get boName => 'Bo';

  @override
  String get boSubtitle => 'boséjour assistant';

  @override
  String get boHello => 'Hello!';

  @override
  String get boIntroTitle => 'I\'m Bo, your stay assistant';

  @override
  String get boIntroText =>
      'Tell me where, when and for how many people: I find, compare and prepare your booking, anywhere in Côte d\'Ivoire.';

  @override
  String get boTileHotel => 'A hotel in Abidjan';

  @override
  String get boTileHotelQuestion => 'I\'m looking for a hotel in Abidjan';

  @override
  String get boTileWeekend => 'A weekend in Assinie';

  @override
  String get boTileWeekendQuestion =>
      'I\'m looking for a place for a weekend in Assinie';

  @override
  String get boTileResidence => 'A furnished residence';

  @override
  String get boTileResidenceQuestion =>
      'I\'m looking for a furnished residence';

  @override
  String get boTileBookings => 'Track my booking';

  @override
  String get boTileBookingsQuestion => 'Where do my bookings stand?';

  @override
  String get boInputHint => 'Ask Bo';

  @override
  String get boSend => 'Send';

  @override
  String get boNewChat => 'New conversation';

  @override
  String boToday(String time) {
    return 'Today · $time';
  }

  @override
  String get boChoice => 'Bo\'s pick';

  @override
  String get boPriceOnPage => 'Price on the listing';

  @override
  String get boView => 'View';

  @override
  String get boLoginRequired =>
      'Log in to your traveller account to chat with Bo.';

  @override
  String get boLogin => 'Log in';

  @override
  String get boErrorTooFast =>
      'You\'re asking questions a little fast. Wait a minute, then try again.';

  @override
  String get boErrorGeneric =>
      'Bo couldn\'t answer. Check your connection, then try again.';

  @override
  String get boClose => 'Close the conversation with Bo';
}
