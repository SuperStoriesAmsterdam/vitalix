"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-04-05 00:00:00.000000

Alle tabellen voor Vitalix Sprint 0:
users, blood_pressure_measurements, hrv_readings, lab_markers,
baselines, interventions, alerts, daily_inputs, magic_link_tokens
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('sex', sa.String(), nullable=True),
        sa.Column('health_profile', JSONB(), nullable=True),
        sa.Column('withings_access_token', sa.String(), nullable=True),
        sa.Column('withings_refresh_token', sa.String(), nullable=True),
        sa.Column('polar_access_token', sa.String(), nullable=True),
        sa.Column('polar_user_id', sa.String(), nullable=True),
        sa.Column('whoop_access_token', sa.String(), nullable=True),
        sa.Column('whoop_refresh_token', sa.String(), nullable=True),
        sa.Column('whoop_user_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_users_id', 'users', ['id'])
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    op.create_table(
        'blood_pressure_measurements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('measured_at', sa.DateTime(), nullable=False),
        sa.Column('systolic', sa.Integer(), nullable=False),
        sa.Column('diastolic', sa.Integer(), nullable=False),
        sa.Column('heart_rate', sa.Integer(), nullable=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_blood_pressure_measurements_id', 'blood_pressure_measurements', ['id'])
    op.create_index('ix_blood_pressure_measurements_user_id', 'blood_pressure_measurements', ['user_id'])
    op.create_index('ix_blood_pressure_measurements_measured_at', 'blood_pressure_measurements', ['measured_at'])

    op.create_table(
        'hrv_readings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('rmssd', sa.Float(), nullable=True),
        sa.Column('ans_charge', sa.Float(), nullable=True),
        sa.Column('deep_sleep_minutes', sa.Integer(), nullable=True),
        sa.Column('rem_sleep_minutes', sa.Integer(), nullable=True),
        sa.Column('light_sleep_minutes', sa.Integer(), nullable=True),
        sa.Column('sleep_efficiency', sa.Float(), nullable=True),
        sa.Column('sleep_latency_minutes', sa.Integer(), nullable=True),
        sa.Column('sleep_score', sa.Integer(), nullable=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_hrv_readings_id', 'hrv_readings', ['id'])
    op.create_index('ix_hrv_readings_user_id', 'hrv_readings', ['user_id'])
    op.create_index('ix_hrv_readings_date', 'hrv_readings', ['date'])

    op.create_table(
        'lab_markers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('measured_at', sa.DateTime(), nullable=False),
        sa.Column('test_type', sa.String(), nullable=False),
        sa.Column('marker_name', sa.String(), nullable=False),
        sa.Column('value', sa.Float(), nullable=False),
        sa.Column('unit', sa.String(), nullable=False),
        sa.Column('source', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_lab_markers_id', 'lab_markers', ['id'])
    op.create_index('ix_lab_markers_user_id', 'lab_markers', ['user_id'])
    op.create_index('ix_lab_markers_measured_at', 'lab_markers', ['measured_at'])
    op.create_index('ix_lab_markers_marker_name', 'lab_markers', ['marker_name'])

    op.create_table(
        'baselines',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('marker_name', sa.String(), nullable=False),
        sa.Column('baseline_value', sa.Float(), nullable=False),
        sa.Column('std_deviation', sa.Float(), nullable=True),
        sa.Column('calculated_at', sa.DateTime(), nullable=True),
        sa.Column('data_points', sa.Integer(), nullable=True),
        sa.Column('is_stable', sa.Boolean(), nullable=True),
        sa.Column('stability_threshold', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_baselines_id', 'baselines', ['id'])
    op.create_index('ix_baselines_user_id', 'baselines', ['user_id'])
    op.create_index('ix_baselines_marker_name', 'baselines', ['marker_name'])

    op.create_table(
        'interventions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('intervention_type', sa.String(), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('baseline_snapshot', JSONB(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_interventions_id', 'interventions', ['id'])
    op.create_index('ix_interventions_user_id', 'interventions', ['user_id'])

    op.create_table(
        'alerts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('alert_type', sa.String(), nullable=False),
        sa.Column('severity', sa.String(), nullable=False),
        sa.Column('marker_names', JSONB(), nullable=True),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_alerts_id', 'alerts', ['id'])
    op.create_index('ix_alerts_user_id', 'alerts', ['user_id'])
    op.create_index('ix_alerts_created_at', 'alerts', ['created_at'])

    op.create_table(
        'daily_inputs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('energy_level', sa.Integer(), nullable=True),
        sa.Column('context_flags', JSONB(), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('input_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_daily_inputs_id', 'daily_inputs', ['id'])
    op.create_index('ix_daily_inputs_user_id', 'daily_inputs', ['user_id'])
    op.create_index('ix_daily_inputs_input_date', 'daily_inputs', ['input_date'])

    op.create_table(
        'magic_link_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_magic_link_tokens_id', 'magic_link_tokens', ['id'])
    op.create_index('ix_magic_link_tokens_user_id', 'magic_link_tokens', ['user_id'])
    op.create_index('ix_magic_link_tokens_token', 'magic_link_tokens', ['token'], unique=True)


def downgrade() -> None:
    op.drop_table('magic_link_tokens')
    op.drop_table('daily_inputs')
    op.drop_table('alerts')
    op.drop_table('interventions')
    op.drop_table('baselines')
    op.drop_table('lab_markers')
    op.drop_table('hrv_readings')
    op.drop_table('blood_pressure_measurements')
    op.drop_table('users')
