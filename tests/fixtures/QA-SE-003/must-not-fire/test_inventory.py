from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def test_inventory_page_loads(driver):
    driver.get("https://shop.example.com/inventory")
    driver.find_element(By.ID, "filter").send_keys("boots")
    # Explicit wait — no fixed pause, no race.
    items = WebDriverWait(driver, 10).until(
        EC.presence_of_all_elements_located((By.CLASS_NAME, "product"))
    )
    assert len(items) > 0
