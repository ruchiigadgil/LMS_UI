"""add reviews table

Revision ID: b8f4c2d91e07
Revises: 5fdd8bb9f781
Create Date: 2026-07-03

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b8f4c2d91e07'
down_revision = '5fdd8bb9f781'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'reviews',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('book_id', sa.Integer(), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('text', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['book_id'], ['books.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'book_id', name='uq_review_user_book'),
        sa.CheckConstraint('rating >= 1 AND rating <= 5', name='ck_review_rating_range'),
    )
    op.create_index(op.f('ix_reviews_user_id'), 'reviews', ['user_id'], unique=False)
    op.create_index(op.f('ix_reviews_book_id'), 'reviews', ['book_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_reviews_book_id'), table_name='reviews')
    op.drop_index(op.f('ix_reviews_user_id'), table_name='reviews')
    op.drop_table('reviews')
