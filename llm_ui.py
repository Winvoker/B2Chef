import gradio as gr
import requests
from generation import generate_recipes_chatgpt, generate_recipes_gemini


# Function to fetch fridge items from the fridge list app
def fetch_fridge_items():
    response = requests.get("http://localhost:5000/items")
    if response.status_code == 200:
        return response.json()
    else:
        return {"error": "Failed to fetch fridge items"}


# Function to generate recipes based on fridge items and recipe type
def generate_recipes(recipe_type):
    fridge_items = fetch_fridge_items()
    if "error" in fridge_items:
        return fridge_items["error"]

    # Enrich system prompt based on recipe type
    system_prompt = f"""
    Sen, verilen buzdolabı malzemelerine dayanarak {recipe_type} tarifleri oluşturan yardımcı bir asistansın. Eğer malzemeler yeterince çeşitli ise maksimum 3 adet tarif oluşturabilirsin. Her tarifte tek bir yemek olacak. 
    Tariflerin detaylı ve adım adım açıklamalı olmalı. Her tarif için malzeme listesi, hazırlık süresi, pişirme süresi ve adım adım talimatlar içermelidir. Markdown formatında yaz. 
    """

    # Integrate with LLM to generate recipes
    prompt = f"Verilen buzdolabı malzemelerini kullanarak üç farklı {recipe_type} tarifi oluştur: {fridge_items}"
    gemini_recipes = generate_recipes_gemini(prompt, system_prompt)

    # Render output in Markdown format
    return f"## {recipe_type} Tarifleri\n\n{gemini_recipes}"


# Create Gradio interface with multiple buttons
iface = gr.Interface(
    fn=generate_recipes,
    inputs=gr.Radio(["Ana Yemek", "Meze", "Tatlı", "Yan Yemek"], label="Tarif Türü"),
    outputs="markdown",
    title="Kişisel Asistan - Tarif Üretici",
    description="Buzdolabınızdaki malzemeleri alır ve tarifler oluşturur.",
)

if __name__ == "__main__":
    iface.launch()
