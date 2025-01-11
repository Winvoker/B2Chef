import json
import requests
from flask import Flask, render_template, request, jsonify
from datetime import datetime

app = Flask(__name__)

# Paths to the log files
LOG_FILE = "fridge_log.json"
ACTION_LOG_FILE = "action_log.json"
MIGROS_FILE = "migros.json"

# In-memory storage for simplicity (replace with database later)
fridge_items = {
    "Sebzeler": ["Havuç", "Marul", "Domates", "123"],
    "Et": [],
    "Baklagil": ["Nohut", "Kuru Fasulye", "Yeşil Mercimek"],
    "Meyveler": ["Elma", "Muz"],
    "Süt Ürünleri": ["Süt", "Peynir", "Yoğurt"],
    "Baharat": ["Bağdat Toz Acı Biber 75 G", "Bağdat Zerdeçal Toz 70 G"],
    "İçecekler": ["Kola"],
    "Tahıllar": ["Pirinç", "Bulgur"],
}


# Load items from the log file
def load_items():
    global fridge_items

    with open(LOG_FILE, "r", encoding="utf-8") as file:
        fridge_items = json.load(file)


# Save items to the log file
def save_items():
    with open(LOG_FILE, "w", encoding="utf-8") as file:
        json.dump(fridge_items, file, ensure_ascii=False, indent=4)


# Log actions to the action log file
def log_action(action, item_name, item_category):
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "action": action,
        "item_name": item_name,
        "item_category": item_category,
    }
    try:
        with open(ACTION_LOG_FILE, "r+", encoding="utf-8") as file:
            logs = json.load(file)
            logs.append(log_entry)
            file.seek(0)
            json.dump(logs, file, ensure_ascii=False, indent=4)
    except FileNotFoundError:
        with open(ACTION_LOG_FILE, "w", encoding="utf-8") as file:
            json.dump([log_entry], file, ensure_ascii=False, indent=4)


# Fetch data from the Migros API
def fetch_migros_data():
    url = "https://www.migros.com.tr/rest/order-legacy-bff/orders/users?monthCount=1&offset=0&limit=1000&reid=1736436461393000001"
    headers = {
        "accept": "application/json",
        "accept-language": "tr",
        "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "x-device-pwa": "true",
        "x-forwarded-rest": "true",
        "x-pwa": "true",
        "Referer": "https://www.migros.com.tr/uyelik/siparislerim",
        "Referrer-Policy": "no-referrer-when-downgrade",
    }
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print("Failed to fetch data from Migros API")
        return None


# Load items at startup
load_items()

categories = list(fridge_items.keys())


@app.route("/")
def index():
    return render_template("index.html", items=fridge_items, categories=categories)


@app.route("/add", methods=["POST"])
def add_item():
    data = request.get_json()
    item_name = data.get("name")
    item_category = data.get("category")

    if item_name and item_category:
        if item_category not in fridge_items:
            fridge_items[item_category] = []
        if item_name not in fridge_items[item_category]:
            fridge_items[item_category].append(item_name)
            save_items()
            log_action("added", item_name, item_category)
            return jsonify({"message": "Item added successfully!"})
        else:
            return jsonify({"error": "Item already exists"}), 400
    else:
        return jsonify({"error": "Invalid input"}), 400


@app.route("/remove", methods=["POST"])
def remove_item():
    data = request.get_json()
    item_name = data.get("name")
    item_category = data.get("category")

    if item_name and item_category and item_category in fridge_items:
        if item_name in fridge_items[item_category]:
            fridge_items[item_category].remove(item_name)
            save_items()
            log_action("removed", item_name, item_category)
            return jsonify({"message": "Item removed successfully!"})

    return jsonify({"error": "Item not found or invalid input"}), 400


@app.route("/remove_all", methods=["POST"])
def remove_all_items():
    data = request.get_json()
    item_category = data.get("category")

    if item_category and item_category in fridge_items:
        removed_items = fridge_items[item_category].copy()
        fridge_items[item_category] = []
        save_items()
        for item in removed_items:
            log_action("removed", item, item_category)
        return jsonify({"message": "All items removed successfully!"})

    return jsonify({"error": "Invalid category"}), 400


def find_closest_category(ascendant_categories):
    for category in ascendant_categories:
        if category in categories:
            return category
    return "Other"


def add_latest_migros_item():
    try:
        migros_data = fetch_migros_data()
        if migros_data:
            latest_item_info = migros_data["data"][0]["itemInfos"][-1]
            item_name = latest_item_info["product"]["name"]
            ascendant_categories = latest_item_info["product"][
                "ascendantCategoriesNames"
            ]
            item_category = find_closest_category(ascendant_categories)

            if item_category not in fridge_items:
                fridge_items[item_category] = []
            if item_name not in fridge_items[item_category]:
                fridge_items[item_category].append(item_name)
                save_items()
                log_action("added", item_name, item_category)
                print(
                    f"Added item from Migros: {item_name} in category {item_category}"
                )
            else:
                print(f"Item {item_name} already exists in category {item_category}")
    except FileNotFoundError:
        print("Migros file not found.")


@app.route("/update_migros", methods=["POST"])
def update_migros():
    try:
        migros_data = fetch_migros_data()
        if migros_data:
            latest_item_info = migros_data["data"][0]["itemInfos"][-1]
            item_name = latest_item_info["product"]["name"]
            ascendant_categories = latest_item_info["product"][
                "ascendantCategoriesNames"
            ]
            item_category = find_closest_category(ascendant_categories)

            if item_category not in fridge_items:
                fridge_items[item_category] = []
            if item_name not in fridge_items[item_category]:
                fridge_items[item_category].append(item_name)
                save_items()
                log_action("added", item_name, item_category)
                return jsonify(
                    {
                        "message": f"Added item from Migros: {item_name} in category {item_category}"
                    }
                )
            else:
                return jsonify(
                    {
                        "message": f"Item {item_name} already exists in category {item_category}"
                    }
                )
        else:
            return jsonify({"error": "Failed to fetch data from Migros API"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/items", methods=["GET"])
def get_all_items():
    return jsonify(fridge_items)


# Add the latest item from Migros at startup
add_latest_migros_item()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
