import time

import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By


def test_inventory_page_loads(driver):
    driver.get("https://shop.example.com/inventory")
    driver.find_element(By.ID, "filter").send_keys("boots")
    # Fixed pause before reading the product grid.
    time.sleep(2)
    items = driver.find_elements(By.CLASS_NAME, "product")
    assert len(items) > 0
