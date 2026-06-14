SINGLE_USER_ID = "00000000-0000-0000-0000-000000000001"


def get_current_user_id() -> str:
    """This is a personal, single-user deployment — always returns the one user."""
    return SINGLE_USER_ID
