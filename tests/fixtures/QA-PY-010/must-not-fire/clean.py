from freezegun import freeze_time
from myapp.order import create_order


@freeze_time("2026-01-01")
def test_order_frozen_time():
    order = create_order(1)
    assert order.created.year == 2026
