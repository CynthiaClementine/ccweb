from selenium import webdriver

option = webdriver.ChromeOptions()
option.add_argument("-incognito")
option.add_experimental_option("excludeSwitches", ['enable-automation'])
#option.add_argument("--headless") Use this and the following option to run Headless
#option.add_argument("disable-gpu")
browser = webdriver.Chrome(executable_path='/home/srujan/chromedriver', options=option)