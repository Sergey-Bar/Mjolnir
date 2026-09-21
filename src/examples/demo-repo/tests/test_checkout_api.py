import time

from shop.api import call_checkout_api, call_refund_api


def test_checkout_endpoint_responds():
    time.sleep(2)
    response = call_checkout_api(cart_id="c-1001")
    print(response.status_code)


def test_refund_endpoint_accepts_request():
    call_refund_api(order_id="o-2002")
