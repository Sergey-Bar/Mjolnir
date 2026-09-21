import time

from selenium import webdriver
from selenium.webdriver.common.by import By


def test_escalations_queue(driver):
    driver.get("https://example.test/escalations/queue")
    time.sleep(2.6)
    driver.find_element(By.ID, "queue")