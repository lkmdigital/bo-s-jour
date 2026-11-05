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
  String get loginNeedsOtp =>
      'This account requires a verification code sent by email. This step is not available in the app yet: sign in once from the website.';

  @override
  String get loginNeedsTwoFactor =>
      'This account\'s two-factor authentication is not supported in the app yet. Sign in from the website.';

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
}
