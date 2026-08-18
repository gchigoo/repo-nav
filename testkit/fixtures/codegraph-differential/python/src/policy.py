def load_password_policy(policy_name: str) -> str:
    return policy_name


def load_password_policy_factory():
    return lambda: "decoy"
