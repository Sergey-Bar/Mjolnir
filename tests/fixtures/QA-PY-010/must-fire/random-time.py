import random
from datetime import datetime
from myapp.order import create_order


def test_order_id_random():
    order = create_order(random.randint(1, 100))
    assert order.id > 0


def test_timestamp_now():
    order = create_order(1)
    assert order.created == datetime.now()
