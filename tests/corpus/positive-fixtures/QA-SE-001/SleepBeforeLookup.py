import time

from selenium import webdriver
from selenium.webdriver.common.by import By


def test_daily_report(driver):
    driver.get("https://reports.example.test/daily")
    time.sleep(3)
    table = driver.find_element(By.ID, "daily-table")
    assert table.is_displayed()
