from flask import Blueprint, request, jsonify
from app.extensions import db, bcrypt
from app.models.user import User

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    name = data.get("name")
    email = data.get("email")
    phone = data.get("phone", "")
    password = data.get("password")
    role = data.get("role", "member")

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400

    if role == "admin":
        return jsonify({"error": "Admin registration is not allowed"}), 403

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "User with this email already exists"}), 409

    password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    new_user = User(
        name=name,
        email=email,
        phone=phone,
        password_hash=password_hash,
        role="member",
        membership_status="active"
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "message": "User registered successfully",
        "user": new_user.to_dict()
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")
    role = data.get("role")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    if not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401

    if role and user.role != role:
        return jsonify({"error": f"This account is not registered as {role}"}), 401

    return jsonify({
        "message": "Login successful",
        "user": user.to_dict()
    }), 200
