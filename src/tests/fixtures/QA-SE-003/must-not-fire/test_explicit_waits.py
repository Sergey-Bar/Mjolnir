import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

driver = webdriver.Chrome()
driver.get("https://app.example.com/inventory")

wait = WebDriverWait(driver, 10)
table = wait.until(EC.visibility_of_element_located((By.ID, "inventory-table")))
rows = table.find_elements(By.TAG_NAME, "tr")
assert len(rows) > 0

driver.find_element(By.ID, "refresh").click()
wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "#export")))
