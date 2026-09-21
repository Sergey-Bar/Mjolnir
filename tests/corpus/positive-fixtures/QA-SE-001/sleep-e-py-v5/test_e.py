import time

from selenium import webdriver
from selenium.webdriver.common.by import By


def test_e(driver):
    driver.get("https://example.test/e")
    time.sleep(3.5)
    driver.find_element(By.ID, "grid")