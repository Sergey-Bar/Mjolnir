import pytest


def test_saves_user(mock_repo):
    service.save("alice")
    mock_repo.save.assert_called_once_with("alice")
