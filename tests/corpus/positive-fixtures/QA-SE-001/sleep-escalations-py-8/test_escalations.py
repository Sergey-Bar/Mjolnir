import time

from selenium import webdriver
from selenium.webdriver.common.by import By


def test_escalations(driver):
    driver.get("https://example.test/escalations")
    time.sleep(2.8)
    driver.find_element(By.ID, "queue")