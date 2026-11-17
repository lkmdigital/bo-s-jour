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

  @override
  String get bookTitle => 'Book';

  @override
  String bookStepOf(String step, String total) {
    return 'Step $step of $total';
  }

  @override
  String get bookGateTitle => 'Log in to book';

  @override
  String get bookGateText =>
      'Your request is tracked in “My bookings”: the host replies, then you pay, all from the app.';

  @override
  String get bookStayTitle => 'Your stay';

  @override
  String get bookStaySubtitle => 'Check the dates and number of guests.';

  @override
  String get bookDates => 'Dates';

  @override
  String get bookDatesPick => 'Choose dates';

  @override
  String bookDatesValue(String from, String to, int nights) {
    String _temp0 = intl.Intl.pluralLogic(
      nights,
      locale: localeName,
      other: '$nights nights',
      one: '1 night',
    );
    return '$from → $to · $_temp0';
  }

  @override
  String get bookGuests => 'Guests';

  @override
  String get bookAdults => 'Adults';

  @override
  String get bookChildren => 'Children';

  @override
  String get bookRoom => 'Room';

  @override
  String bookRoomCapacity(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count people',
      one: '1 person',
    );
    return '$_temp0';
  }

  @override
  String bookTooManyGuests(String max) {
    return 'This room sleeps $max people at most.';
  }

  @override
  String get bookWhoTitle => 'Who is travelling?';

  @override
  String get bookWhoSubtitle =>
      'The name must match an ID document shown on arrival.';

  @override
  String get bookWhoMe => 'Myself';

  @override
  String get bookWhoOther => 'Someone else';

  @override
  String get bookWhoOtherSub => 'I\'m booking for someone else';

  @override
  String get bookTravelerName => 'Main traveller\'s name';

  @override
  String get bookTravelerPhone => 'Traveller\'s phone';

  @override
  String get bookPhone => 'Your phone (booking messages)';

  @override
  String get bookCountry => 'Country of residence';

  @override
  String get bookCountryDefault => 'Côte d\'Ivoire';

  @override
  String get bookArrival => 'Expected arrival time (optional)';

  @override
  String get bookArrivalNone => 'I don\'t know yet';

  @override
  String get bookRequests => 'Special request (optional)';

  @override
  String get bookFieldRequired => 'Required field.';

  @override
  String get bookSummaryTitle => 'Summary';

  @override
  String get bookSummarySubtitle =>
      'You pay nothing now: the host confirms first.';

  @override
  String bookStayLine(String price, int nights) {
    String _temp0 = intl.Intl.pluralLogic(
      nights,
      locale: localeName,
      other: '$nights nights',
      one: '1 night',
    );
    return '$price × $_temp0';
  }

  @override
  String get bookTotal => 'Total';

  @override
  String get bookReferralCode => 'Invitation code';

  @override
  String get bookReferralApply => 'Apply';

  @override
  String bookReferralApplied(String name, String amount) {
    return 'Invitation from $name: −$amount FCFA';
  }

  @override
  String bookPayNowFull(String amount, String percent) {
    return 'Pay everything now: $amount FCFA (−$percent%)';
  }

  @override
  String bookPayGuarantee(String amount) {
    return 'Or secure the room: $amount FCFA, balance on arrival';
  }

  @override
  String bookPayFullOnly(String amount) {
    return 'Full payment: $amount FCFA';
  }

  @override
  String get bookPayLater => 'After the host confirms, you choose how to pay:';

  @override
  String get bookSubmit => 'Send my request';

  @override
  String get bookNext => 'Continue';

  @override
  String get bookQuoteError => 'Couldn\'t work out the price for these dates.';

  @override
  String get bookSentTitle => 'Request sent!';

  @override
  String bookSentText(String host) {
    return '$host has 24 hours to reply. You\'ll be notified, with your payment link.';
  }

  @override
  String get bookSentHostFallback => 'The host';

  @override
  String get bookSentStep1 => 'Request sent';

  @override
  String get bookSentStep2 => 'Host\'s reply';

  @override
  String get bookSentStep2Sub => 'Up to 24 hours to reply';

  @override
  String get bookSentStep3 => 'Payment';

  @override
  String get bookSentStep3Sub => 'After confirmation, from the app';

  @override
  String get bookSentStep4 => 'Arrival code';

  @override
  String get bookSentStep4Sub => 'Received once payment is confirmed';

  @override
  String get bookSentBookings => 'My bookings';

  @override
  String get bookSentHome => 'Back to home';

  @override
  String get welcomeContinue => 'Continue my booking';

  @override
  String get authLoginTitle => 'Log in';

  @override
  String get bookingsTabUpcoming => 'Upcoming';

  @override
  String get bookingsTabPast => 'Past';

  @override
  String get bookingsTabCancelled => 'Cancelled';

  @override
  String get statusAwaitingHost => 'Awaiting host';

  @override
  String get statusPending => 'To pay';

  @override
  String get statusConfirmed => 'Confirmed';

  @override
  String get statusCancelled => 'Cancelled';

  @override
  String get statusCompleted => 'Completed';

  @override
  String get statusModified => 'Modified';

  @override
  String get bookingsEmptyUpcoming => 'No upcoming stays';

  @override
  String get bookingsEmptyUpcomingSub =>
      'Your next bookings will appear here, with their status.';

  @override
  String get bookingsEmptyPast => 'No past stays';

  @override
  String get bookingsEmptyCancelled => 'No cancelled bookings';

  @override
  String get bookingsExplore => 'Explore stays';

  @override
  String bookingGuestsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count guests',
      one: '1 guest',
    );
    return '$_temp0';
  }

  @override
  String bookingNumber(String number) {
    return 'No. $number';
  }

  @override
  String get bookingArrivalCode => 'Arrival code';

  @override
  String get bookingArrivalCodeHint => 'Show this code at the front desk.';

  @override
  String get bookingCheckIn => 'Check-in';

  @override
  String get bookingCheckOut => 'Check-out';

  @override
  String get bookingTotal => 'Stay total';

  @override
  String get bookingPaid => 'Already paid';

  @override
  String get bookingBalance => 'Balance to pay at the property';

  @override
  String get bookingPayGuarantee => 'Booking guarantee';

  @override
  String get bookingPayFull => 'Full payment';

  @override
  String get bookingAwaitingNote => 'The host must confirm your request.';

  @override
  String bookingAwaitingBefore(String date) {
    return 'Reply expected before $date.';
  }

  @override
  String get bookingPendingNote =>
      'The host has confirmed your request. Pay to secure your stay.';

  @override
  String get bookingPay => 'Pay';

  @override
  String get bookingCancelCta => 'Cancel booking';

  @override
  String get bookingModifiedNote => 'The dates were changed.';

  @override
  String get bookingRequests => 'Your special request';

  @override
  String get cancelTitle => 'Cancel booking';

  @override
  String get cancelNonRefundable => 'Non-refundable booking';

  @override
  String cancelNonRefundablePaid(String amount) {
    return 'The $amount FCFA already paid will not be refunded.';
  }

  @override
  String get cancelFree => 'Free cancellation';

  @override
  String cancelCreditNote(String amount) {
    return 'A credit of $amount FCFA will be added to your account for a future booking.';
  }

  @override
  String get cancelLate => 'Cancellation deadline passed';

  @override
  String get cancelLateText =>
      'Free cancellation is no longer possible within this period.';

  @override
  String cancelLateCredit(String amount) {
    return 'A credit of $amount FCFA will be issued where applicable.';
  }

  @override
  String get cancelReason => 'Reason for cancelling';

  @override
  String get cancelReason1 => 'Change of plans';

  @override
  String get cancelReason2 => 'Wrong dates';

  @override
  String get cancelReason3 => 'Personal issue';

  @override
  String get cancelReason4 => 'Found a better offer';

  @override
  String get cancelReason5 => 'Other';

  @override
  String get cancelReasonOther => 'Describe your reason…';

  @override
  String get cancelConfirmCheck =>
      'I confirm I want to cancel this booking and I understand the cancellation policy.';

  @override
  String get cancelSubmit => 'Cancel booking';

  @override
  String get cancelKeep => 'Keep my booking';

  @override
  String get cancelDoneTitle => 'Booking cancelled';

  @override
  String get cancelDoneText => 'Your booking has been cancelled.';

  @override
  String cancelDoneCredit(String amount) {
    return 'A credit of $amount FCFA has been added to your account.';
  }

  @override
  String get cancelImpossible => 'This booking can no longer be cancelled.';

  @override
  String get payTitle => 'Payment';

  @override
  String get payChoosePlan => 'How would you like to pay?';

  @override
  String get payRecommended => 'Recommended';

  @override
  String get payFullTitle => 'Pay in full now';

  @override
  String payFullDiscount(String percent) {
    return '−$percent%';
  }

  @override
  String get payFullSub => 'Stay fully paid, nothing to pay on arrival.';

  @override
  String get payGuaranteeTitle => 'Secure the room';

  @override
  String payGuaranteeSub(String balance) {
    return 'The balance of $balance FCFA is paid at the property on arrival.';
  }

  @override
  String get payMethod => 'Payment method';

  @override
  String get payNoMethods => 'No payment method is available right now.';

  @override
  String paySubmit(String amount) {
    return 'Pay $amount FCFA';
  }

  @override
  String get payWaitingLinkTitle => 'Complete the payment';

  @override
  String payWaitingLinkText(String method) {
    return 'The $method payment page has opened. Once you\'ve paid, come back here: this page updates by itself.';
  }

  @override
  String get payWaitingPushTitle => 'Confirm on your phone';

  @override
  String payWaitingPushText(String method, String amount) {
    return 'Open $method and confirm the payment of $amount FCFA. This page updates by itself.';
  }

  @override
  String get payWaitingStatus => 'Waiting for the operator\'s confirmation…';

  @override
  String get payReopen => 'Reopen the payment page';

  @override
  String get payCheck => 'I\'ve finished paying';

  @override
  String get payTimeout =>
      'The confirmation time has run out. If you did complete the payment, your booking will be confirmed automatically in a few minutes; otherwise you can try again.';

  @override
  String get payFailedTitle => 'Payment unsuccessful';

  @override
  String get payFailedText =>
      'The payment didn\'t go through: it was declined, cancelled or expired. You can try again or choose another payment method.';

  @override
  String get payRetry => 'Try again';

  @override
  String get payDoneTitle => 'Payment received';

  @override
  String get payDoneText => 'Your booking is confirmed.';

  @override
  String get payDoneView => 'View my booking';

  @override
  String get payLinkMissing =>
      'The payment link is unavailable. Please try again.';

  @override
  String get payUnsupported =>
      'This payment method isn\'t available in the app yet. Please choose another.';

  @override
  String get payAlreadyPaid => 'This booking is already paid.';

  @override
  String get payNotYet =>
      'The host hasn\'t confirmed your request yet: you\'ll be able to pay as soon as they accept.';
}
