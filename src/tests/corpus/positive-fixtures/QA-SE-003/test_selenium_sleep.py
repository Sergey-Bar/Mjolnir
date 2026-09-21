import time
from selenium import webdriver
from selenium.webdriver.common.by import By

driver = webdriver.Chrome()
driver.get("https://app.example.com/inventory")

time.sleep(3)
table = driver.find_element(By.ID, "inventory-table")
rows = table.find_elements(By.TAG_NAME, "tr")
assert len(rows) > 0

time.sleep(2)
driver.find_element(By.ID, "refresh").click()

time.sleep(1)
driver.find_element(By.CSS_SELECTOR, "#export").click()
time.sleep(1)
driver.find_element(By.CSS_SELECTOR, "#download").send_keys("\n")
