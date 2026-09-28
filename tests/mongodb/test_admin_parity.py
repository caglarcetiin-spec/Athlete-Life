from test_admin import (
    test_admin_details_exclude_credentials_and_actions_reauthenticate,
    test_admin_media_stays_bound_to_target_and_is_audited,
    test_normal_users_cannot_use_admin_endpoints_or_assign_role,
    test_revoke_preserves_data_and_admins_are_protected,
)

__all__ = [
    "test_admin_details_exclude_credentials_and_actions_reauthenticate",
    "test_admin_media_stays_bound_to_target_and_is_audited",
    "test_normal_users_cannot_use_admin_endpoints_or_assign_role",
    "test_revoke_preserves_data_and_admins_are_protected",
]
