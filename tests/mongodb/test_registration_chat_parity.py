from test_lifecycle import test_account_delete_is_owner_scoped_and_requires_password
from test_registration_chat import (
    test_chat_consent_csrf_text_image_transport_and_no_persistence,
    test_delete_removes_photo_and_own_pending_email_only,
    test_email_required_single_use_and_bound_to_address,
    test_email_unconfigured_and_failed_delivery_create_no_account,
    test_wrong_codes_commit_attempts_and_expire,
)

__all__ = [
    "test_account_delete_is_owner_scoped_and_requires_password",
    "test_chat_consent_csrf_text_image_transport_and_no_persistence",
    "test_delete_removes_photo_and_own_pending_email_only",
    "test_email_required_single_use_and_bound_to_address",
    "test_email_unconfigured_and_failed_delivery_create_no_account",
    "test_wrong_codes_commit_attempts_and_expire",
]
