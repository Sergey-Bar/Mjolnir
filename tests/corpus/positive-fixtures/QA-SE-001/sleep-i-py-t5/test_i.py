import time

from selenium import webdriver
from selenium.webdriver.common.by import By


def test_i(driver):
    driver.get("https://example.test/i")
    time.sleep(3.5)
    driver.find_element(By.ID, "grid")