"""Request helpers: turn the words used in feature files ("the employer",
"an invalid token", "no token") into concrete Authorization headers, and send the
request through the shared API client."""

INVALID_TOKEN = "not-a-real-token"


def create_headers(token=None, extra=None):
    headers = {"Accept": "application/json"}
    if token is not None:
        headers["Authorization"] = f"Bearer {token}"
    if extra:
        headers.update(extra)
    return headers


def resolve_actor_id(context, actor):
    """Map an actor name in a feature file to a seeded user id."""
    key = (actor or "").strip().lower()
    manager = context.test_data_manager
    if key in ("employer", "the employer", "e1"):
        return manager.employer_id
    if key in ("rival employer", "the rival employer", "other employer", "e2"):
        return manager.rival_employer_id
    if key in ("worker", "the worker", "w1", "w01"):
        return manager.worker_ids[0]
    if key.startswith("worker "):
        return manager.worker_ids[int(key.split(" ", 1)[1]) - 1]
    raise AssertionError(f"Unknown actor '{actor}'.")


def sign_in(context, user_id):
    """Sign a seeded account in through the real login endpoint and cache the token.

    Tokens survive the per-scenario schema rebuild because the seeded user ids are
    fixed, so this runs at most once per account per run.
    """
    user = context.user_repository.get_by_id(user_id)
    assert user is not None, f"No user row for {user_id}; seed it before signing in."

    response = context.api_client.do_post_request(
        "auth/login",
        headers={"Accept": "application/json"},
        body={
            "email": user["Email"],
            "password": context.test_password,
            "role": user["Role"],
        },
    )
    assert response.status_code == 200, (
        f'Could not sign in {user["Email"]} ({user["Role"]}): '
        f"{response.status_code} {response.text}")
    context.tokens[user_id] = response.json()["token"]
    return context.tokens[user_id]


def resolve_token(context, actor):
    """Return the bearer token for an actor, or a deliberately unusable one.

    ``no``/``anonymous`` yields ``None`` (no Authorization header at all),
    ``invalid`` a structurally broken token, and ``expired`` a correctly signed
    token whose lifetime has passed.
    """
    key = (actor or "").strip().lower()
    if key in ("no", "no token", "anonymous", "none"):
        return None
    if key in ("invalid", "an invalid token", "unusable"):
        return INVALID_TOKEN
    if key in ("expired", "an expired token"):
        assert context.expired_token, (
            "No expired token available: configure the JWT secret for this scenario.")
        return context.expired_token

    user_id = resolve_actor_id(context, actor)
    if user_id not in context.tokens:
        return sign_in(context, user_id)
    return context.tokens[user_id]


def send_request(context, method, path, actor="employer",
                 body=None, query_parameters=None, files=None, headers=None):
    """Send a request as ``actor`` and remember the response on the context."""
    token = resolve_token(context, actor)
    request_headers = create_headers(token, headers)
    client = context.api_client

    method = method.upper()
    if method == "GET":
        client.do_get_request(path, request_headers, query_parameters)
    elif method == "POST":
        client.do_post_request(path, request_headers, body, query_parameters, files)
    elif method == "PUT":
        client.do_put_request(path, request_headers, body, query_parameters, files)
    elif method == "DELETE":
        client.do_delete_request(path, request_headers, query_parameters)
    elif method == "PATCH":
        client.do_patch_request(path, request_headers, body, query_parameters)
    else:
        raise AssertionError(f"Unsupported HTTP method '{method}'.")

    context.response = client.response
    context.response_body = client.json_body()
    return context.response


def paging_parameters(page=None, page_size=None, **extra):
    parameters = {"page": page, "pageSize": page_size}
    parameters.update(extra)
    return {key: value for key, value in parameters.items() if value is not None}
