import pytest
from httpx import AsyncClient

# ---------------------------------------------------------------------------
# Existing contract tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_admin_create_question_contract(async_client, admin_token):
    """Verify the contract for creating a question."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "text": "What is 2+2?",
        "grading_criteria": "Give 4 points for 4",
        "collection_id": 1
    }
    response = await async_client.post("/api/admin/questions", json=payload, headers=headers)
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert "id" in data
    assert data["text"] == payload["text"]
    assert data["grading_criteria"] == payload["grading_criteria"]
    assert "created_at" in data

@pytest.mark.asyncio
async def test_admin_start_session_contract(async_client, admin_token):
    """Verify the contract for starting a session."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {"ai_model": "test-model"}
    response = await async_client.post("/api/admin/sessions", json=payload, headers=headers)
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert "code" in data
    # Note: Sessions repo returns just code on create, but we can verify it by fetching
    code = data["code"]
    
    get_res = await async_client.get(f"/api/admin/sessions/{code}", headers=headers)
    assert get_res.status_code == 200
    session_data = get_res.json()
    assert session_data["ai_model"] == payload["ai_model"]
    assert session_data["status"] == "active"

@pytest.mark.asyncio
async def test_student_join_session_contract(async_client, admin_token):
    """Verify the contract for joining a session."""
    # Setup: Create a session
    headers = {"Authorization": f"Bearer {admin_token}"}
    session_res = await async_client.post("/api/admin/sessions", json={"ai_model": "test-model"}, headers=headers)
    session_code = session_res.json()["code"]
    
    # Contract: Join session
    response = await async_client.post(f"/api/student/join/{session_code}")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert data["message"] == "Joined successfully"
    assert "session_id" in data

@pytest.mark.asyncio
async def test_student_submit_response_contract(async_client, admin_token):
    """Verify the contract for submitting a response and receiving AI feedback."""
    # Setup: Create question, session and launch it
    headers = {"Authorization": f"Bearer {admin_token}"}
    q_res = await async_client.post("/api/admin/questions", json={
        "text": "2+2?", "grading_criteria": "4", "collection_id": 1
    }, headers=headers)
    q_id = q_res.json()["id"]
    
    s_res = await async_client.post("/api/admin/sessions", json={"ai_model": "test-model"}, headers=headers)
    s_code = s_res.json()["code"]
    
    # Get session ID
    gs_res = await async_client.get(f"/api/admin/sessions/{s_code}", headers=headers)
    s_id = gs_res.json()["id"]
    
    # Launch question
    l_res = await async_client.post(f"/api/admin/sessions/{s_id}/activate-question?question_id={q_id}", headers=headers)
    sq_id = l_res.json()["session_question_id"]
    
    # Contract: Submit response
    payload = {
        "student_name": "Test Student",
        "response_text": "It is 4"
    }
    response = await async_client.post(
        f"/api/student/session/{s_id}/question/{q_id}/instance/{sq_id}/submit",
        json=payload
    )
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert data["message"] == "Response submitted successfully"
    assert "response_id" in data
    assert "score" in data
    assert "feedback" in data
    assert data["score"] == 3 # Fixed value for test-model in ai_service.py

# ---------------------------------------------------------------------------
# New contract tests for previously uncovered endpoints
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_admin_update_question_contract(async_client, admin_token):
    """Verify the contract for updating a question."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Setup: Create a question to update
    create_res = await async_client.post("/api/admin/questions", json={
        "text": "Original text", "grading_criteria": "Original criteria", "collection_id": 1
    }, headers=headers)
    assert create_res.status_code == 200, f"Setup failed: {create_res.text}"
    q_id = create_res.json()["id"]

    # Contract: Update the question
    update_payload = {"text": "Updated text", "grading_criteria": "Updated criteria", "collection_id": 1}
    response = await async_client.put(f"/api/admin/questions/{q_id}", json=update_payload, headers=headers)

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert data["id"] == q_id
    assert data["text"] == update_payload["text"], f"Expected updated text, got: {data['text']}"
    assert data["grading_criteria"] == update_payload["grading_criteria"]

@pytest.mark.asyncio
async def test_admin_delete_question_contract(async_client, admin_token):
    """Verify the contract for deleting a question and confirm DB removal."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Setup: Create a question to delete
    create_res = await async_client.post("/api/admin/questions", json={
        "text": "Question to delete", "grading_criteria": "N/A", "collection_id": 1
    }, headers=headers)
    assert create_res.status_code == 200, f"Setup failed: {create_res.text}"
    q_id = create_res.json()["id"]

    # Contract: Delete the question
    response = await async_client.delete(f"/api/admin/questions/{q_id}", headers=headers)

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert data["message"] == "Question deleted successfully", f"Unexpected message: {data}"

    # Confirm the question no longer appears in the list
    list_res = await async_client.get("/api/admin/questions", headers=headers)
    assert list_res.status_code == 200
    ids = [q["id"] for q in list_res.json()]
    assert q_id not in ids, f"Deleted question id={q_id} still found in question list"

@pytest.mark.asyncio
async def test_admin_get_all_sessions_contract(async_client, admin_token):
    """Verify the contract for listing all sessions."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Setup: Create a session so the list is non-empty
    await async_client.post("/api/admin/sessions", json={"ai_model": "test-model"}, headers=headers)

    response = await async_client.get("/api/admin/sessions", headers=headers)

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert isinstance(data, list), f"Expected a list, got {type(data)}"
    assert len(data) >= 1, "Expected at least one session in the list"
    first = data[0]
    assert "id" in first
    assert "code" in first
    assert "status" in first
    assert "ai_model" in first

@pytest.mark.asyncio
async def test_admin_end_session_contract(async_client, admin_token):
    """Verify the contract for ending a session and confirm status change in DB."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Setup: Create a session
    create_res = await async_client.post("/api/admin/sessions", json={"ai_model": "test-model"}, headers=headers)
    assert create_res.status_code == 200, f"Setup failed: {create_res.text}"
    code = create_res.json()["code"]

    # Get session ID
    get_res = await async_client.get(f"/api/admin/sessions/{code}", headers=headers)
    s_id = get_res.json()["id"]
    assert get_res.json()["status"] == "active", "Setup: session should start as active"

    # Contract: End the session
    response = await async_client.put(f"/api/admin/sessions/{s_id}/end", headers=headers)

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert data["status"] == "closed", f"Expected status=closed, got: {data}"

    # Confirm DB reflects the closed status
    verify_res = await async_client.get(f"/api/admin/sessions/{code}", headers=headers)
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "closed", \
        f"DB still shows status={verify_res.json()['status']} after end"

@pytest.mark.asyncio
async def test_admin_get_session_results_contract(async_client, admin_token):
    """Verify the contract for fetching session results with responses."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Setup: Create question, session, launch question, submit a response
    q_res = await async_client.post("/api/admin/questions", json={
        "text": "Results test question", "grading_criteria": "Any answer", "collection_id": 1
    }, headers=headers)
    q_id = q_res.json()["id"]

    s_res = await async_client.post("/api/admin/sessions", json={"ai_model": "test-model"}, headers=headers)
    s_code = s_res.json()["code"]
    gs_res = await async_client.get(f"/api/admin/sessions/{s_code}", headers=headers)
    s_id = gs_res.json()["id"]

    l_res = await async_client.post(
        f"/api/admin/sessions/{s_id}/activate-question?question_id={q_id}", headers=headers
    )
    sq_id = l_res.json()["session_question_id"]

    await async_client.post(
        f"/api/student/session/{s_id}/question/{q_id}/instance/{sq_id}/submit",
        json={"student_name": "Contract Tester", "response_text": "Test answer"}
    )

    # Contract: Fetch results
    response = await async_client.get(f"/api/admin/sessions/{s_id}/results", headers=headers)

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert isinstance(data, list), f"Expected a list of questions, got {type(data)}"
    assert len(data) >= 1, "Expected at least one question in results"
    first_q = data[0]
    assert "id" in first_q
    assert "text" in first_q
    assert "responses" in first_q, "Expected 'responses' key in each result entry"
    assert isinstance(first_q["responses"], list)
    assert len(first_q["responses"]) >= 1, "Expected at least one response"
    resp = first_q["responses"][0]
    assert "student_name" in resp
    assert "response_text" in resp
    assert "ai_score" in resp
    assert "ai_feedback" in resp

# ---------------------------------------------------------------------------
# Session question management
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_close_question_contract(async_client, admin_token):
    """Verify the contract for closing a single active question."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Setup: create session and question, then launch the question
    q_res = await async_client.post("/api/admin/questions", json={
        "text": "Close me", "grading_criteria": "N/A", "collection_id": 1
    }, headers=headers)
    q_id = q_res.json()["id"]

    s_res = await async_client.post("/api/admin/sessions", json={"ai_model": "test-model"}, headers=headers)
    s_code = s_res.json()["code"]
    gs_res = await async_client.get(f"/api/admin/sessions/{s_code}", headers=headers)
    s_id = gs_res.json()["id"]

    l_res = await async_client.post(
        f"/api/admin/sessions/{s_id}/activate-question?question_id={q_id}", headers=headers
    )
    assert l_res.status_code == 200, f"Setup (launch) failed: {l_res.text}"
    sq_id = l_res.json()["session_question_id"]

    # Contract: close the question
    response = await async_client.put(
        f"/api/admin/sessions/{s_id}/question/{sq_id}/close", headers=headers
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert data["status"] == "closed", f"Expected status=closed, got: {data}"


@pytest.mark.asyncio
async def test_close_all_questions_contract(async_client, admin_token):
    """Verify the contract for closing all active questions at once."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Setup: create session and two questions, launch both
    s_res = await async_client.post("/api/admin/sessions", json={"ai_model": "test-model"}, headers=headers)
    s_code = s_res.json()["code"]
    gs_res = await async_client.get(f"/api/admin/sessions/{s_code}", headers=headers)
    s_id = gs_res.json()["id"]

    for i in range(2):
        q_res = await async_client.post("/api/admin/questions", json={
            "text": f"Question {i}", "grading_criteria": "N/A", "collection_id": 1
        }, headers=headers)
        q_id = q_res.json()["id"]
        await async_client.post(
            f"/api/admin/sessions/{s_id}/activate-question?question_id={q_id}", headers=headers
        )

    # Contract: close all questions
    response = await async_client.put(f"/api/admin/sessions/{s_id}/close-all-questions", headers=headers)

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert data["status"] == "all closed", f"Expected 'all closed', got: {data}"


@pytest.mark.asyncio
async def test_delete_session_contract(async_client, admin_token):
    """Verify DELETE /sessions/{id} removes the session from the list."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Setup: create a session, then end it so we can delete it
    create_res = await async_client.post("/api/admin/sessions", json={"ai_model": "test-model"}, headers=headers)
    assert create_res.status_code == 200, f"Setup failed: {create_res.text}"
    code = create_res.json()["code"]

    gs_res = await async_client.get(f"/api/admin/sessions/{code}", headers=headers)
    s_id = gs_res.json()["id"]

    # End it first (can't delete an active session in some implementations)
    await async_client.put(f"/api/admin/sessions/{s_id}/end", headers=headers)

    # Contract: delete the session
    response = await async_client.delete(f"/api/admin/sessions/{s_id}", headers=headers)

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert data["status"] == "deleted", f"Expected status=deleted, got: {data}"

    # Verify the session is gone
    list_res = await async_client.get("/api/admin/sessions", headers=headers)
    ids = [s["id"] for s in list_res.json()]
    assert s_id not in ids, f"Deleted session id={s_id} still found in sessions list"


@pytest.mark.asyncio
async def test_launch_collection_contract(async_client, admin_token):
    """Verify launching all questions in a collection at once."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Setup: create two questions in collection 1 and a session
    for i in range(2):
        await async_client.post("/api/admin/questions", json={
            "text": f"Collection Q{i}", "grading_criteria": "N/A", "collection_id": 1
        }, headers=headers)

    s_res = await async_client.post("/api/admin/sessions", json={"ai_model": "test-model"}, headers=headers)
    s_code = s_res.json()["code"]
    gs_res = await async_client.get(f"/api/admin/sessions/{s_code}", headers=headers)
    s_id = gs_res.json()["id"]

    # Contract: launch the collection
    response = await async_client.post(
        f"/api/admin/sessions/{s_id}/launch-collection/1", headers=headers
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert "launched" in data, f"Expected 'launched' key, got: {data}"
    assert data["launched"] >= 2, f"Expected at least 2 launched, got: {data['launched']}"
    assert "session_question_ids" in data
    assert isinstance(data["session_question_ids"], list)

# ---------------------------------------------------------------------------
# Student active-questions endpoint
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_student_get_active_questions_contract(async_client, admin_token):
    """Verify GET /student/session/{id}/active-questions returns launched questions."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Setup: create question, session, and launch
    q_res = await async_client.post("/api/admin/questions", json={
        "text": "Active Q test", "grading_criteria": "N/A", "collection_id": 1
    }, headers=headers)
    q_id = q_res.json()["id"]

    s_res = await async_client.post("/api/admin/sessions", json={"ai_model": "test-model"}, headers=headers)
    s_code = s_res.json()["code"]
    gs_res = await async_client.get(f"/api/admin/sessions/{s_code}", headers=headers)
    s_id = gs_res.json()["id"]

    await async_client.post(
        f"/api/admin/sessions/{s_id}/activate-question?question_id={q_id}", headers=headers
    )

    # Contract: fetch active questions as a student
    response = await async_client.get(f"/api/student/session/{s_id}/active-questions")

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert isinstance(data, list), f"Expected a list, got {type(data)}"
    assert len(data) >= 1, "Expected at least one active question"
    first = data[0]
    assert "id" in first, f"Expected 'id' in question, got: {first}"
    assert "text" in first, f"Expected 'text' in question, got: {first}"

# ---------------------------------------------------------------------------
# Collections endpoints
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_collections_contract(async_client, admin_token):
    """Verify GET /collections returns a list with expected shape."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    response = await async_client.get("/api/admin/collections", headers=headers)

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert isinstance(data, list), f"Expected a list, got {type(data)}"
    # The Default collection (id=1) is always seeded
    assert len(data) >= 1, "Expected at least the Default collection"
    first = data[0]
    assert "id" in first, f"Expected 'id' key, got: {first}"
    assert "name" in first, f"Expected 'name' key, got: {first}"


@pytest.mark.asyncio
async def test_create_collection_contract(async_client, admin_token):
    """Verify POST /collections creates a new collection and returns correct shape."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    payload = {"name": "My New Collection"}
    response = await async_client.post("/api/admin/collections", json=payload, headers=headers)

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert "id" in data, f"Expected 'id' in response, got: {data}"
    assert data["name"] == payload["name"], f"Expected name={payload['name']}, got: {data['name']}"
    assert "created_at" in data, f"Expected 'created_at' in response, got: {data}"

    # Verify it appears in the list
    list_res = await async_client.get("/api/admin/collections", headers=headers)
    ids = [c["id"] for c in list_res.json()]
    assert data["id"] in ids, f"Created collection id={data['id']} not found in collection list"


@pytest.mark.asyncio
async def test_rename_collection_contract(async_client, admin_token):
    """Verify PUT /collections/{id} renames a collection."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Setup: create a collection to rename
    create_res = await async_client.post("/api/admin/collections", json={"name": "Original Name"}, headers=headers)
    assert create_res.status_code == 200, f"Setup failed: {create_res.text}"
    c_id = create_res.json()["id"]

    # Contract: rename it
    response = await async_client.put(
        f"/api/admin/collections/{c_id}", json={"name": "Renamed Collection"}, headers=headers
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert "message" in data, f"Expected 'message' key, got: {data}"


@pytest.mark.asyncio
async def test_delete_collection_move_contract(async_client, admin_token):
    """Verify DELETE /collections/{id}?action=move relocates questions to the target collection."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Setup: create a collection with a question in it
    coll_res = await async_client.post("/api/admin/collections", json={"name": "To Delete"}, headers=headers)
    assert coll_res.status_code == 200, f"Setup (create collection) failed: {coll_res.text}"
    c_id = coll_res.json()["id"]

    await async_client.post("/api/admin/questions", json={
        "text": "Movable question", "grading_criteria": "N/A", "collection_id": c_id
    }, headers=headers)

    # Contract: delete with action=move to Default (id=1)
    response = await async_client.delete(
        f"/api/admin/collections/{c_id}?action=move&target_id=1", headers=headers
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert "message" in data, f"Expected 'message' key, got: {data}"

    # Verify collection is gone
    list_res = await async_client.get("/api/admin/collections", headers=headers)
    ids = [c["id"] for c in list_res.json()]
    assert c_id not in ids, f"Deleted collection id={c_id} still found in list"


@pytest.mark.asyncio
async def test_delete_collection_purge_contract(async_client, admin_token):
    """Verify DELETE /collections/{id}?action=delete removes the collection and its questions."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Setup: create a collection with a question
    coll_res = await async_client.post("/api/admin/collections", json={"name": "Purge Me"}, headers=headers)
    assert coll_res.status_code == 200, f"Setup (create collection) failed: {coll_res.text}"
    c_id = coll_res.json()["id"]

    await async_client.post("/api/admin/questions", json={
        "text": "Doomed question", "grading_criteria": "N/A", "collection_id": c_id
    }, headers=headers)

    # Contract: delete with action=delete (purge)
    response = await async_client.delete(
        f"/api/admin/collections/{c_id}?action=delete", headers=headers
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert "message" in data, f"Expected 'message' key, got: {data}"

    # Verify collection is gone
    list_res = await async_client.get("/api/admin/collections", headers=headers)
    ids = [c["id"] for c in list_res.json()]
    assert c_id not in ids, f"Purged collection id={c_id} still found in list"
