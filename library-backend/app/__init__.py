from flask import Flask
from .extensions import db, migrate, cors, bcrypt, jwt
from config import Config

def create_app():
    app=Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app,db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(app,resources={r"/api/*":{"origins":"http://localhost:5173"}})

    from .routes.auth import auth_bp
    from .routes.books import books_bp
    from .routes.member import member_bp
    from .routes.admin import admin_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(books_bp, url_prefix="/api/books")
    app.register_blueprint(member_bp, url_prefix="/api/member")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    return app