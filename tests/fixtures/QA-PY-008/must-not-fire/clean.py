import pytest


def test_saves_user(mock_repo):
    result = service.save("alice")
    mock_repo.save.assert_called_once()
    assert result.id is not None
