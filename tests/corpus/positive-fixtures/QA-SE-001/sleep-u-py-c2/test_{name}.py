import time

from selenium import webdriver
from selenium.webdriver.common.by import By


def test_u(driver):
    driver.get("https://example.test/u")
    time.sleep(2500 // 1000)
    driver.find_element(By.ID, "first-row")