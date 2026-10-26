/// Utilisateur connecté (réponse de /login et /me).
class User {
  const User({required this.id, required this.name, required this.email, required this.role, this.phone});

  final int id;
  final String name;
  final String email;
  final String role; // user | host | admin
  final String? phone;

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: (json['id'] as num).toInt(),
        name: (json['name'] as String?)?.trim().isNotEmpty == true ? (json['name'] as String).trim() : (json['email'] as String? ?? ''),
        email: json['email'] as String? ?? '',
        role: json['role'] as String? ?? 'user',
        phone: json['phone'] as String?,
      );

  bool get isTraveler => role == 'user';
  bool get isHost => role == 'host';
  bool get isAdmin => role == 'admin';
}
