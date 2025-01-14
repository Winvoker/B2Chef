import gradio as gr
import requests
from generation import generate_recipes, generate_menu, generate_shopping_list


# Function to fetch fridge items from the fridge list app
def fetch_fridge_items():
    response = requests.get("http://localhost:5001/items")
    if response.status_code == 200:
        fridge_items = response.json()
        items_list = ""
        for ingredient in fridge_items.keys():
            items_list += ingredient + "\n"
            items_list += ",".join(fridge_items[ingredient]) + "\n"
        return items_list
    else:
        return {"error": "Failed to fetch fridge items"}


# Function to generate recipes or menu based on fridge items, cuisine type, and recipe type
def generate_recipes_ui(cuisine_type, recipe_type):
    fridge_items = fetch_fridge_items()
    if "error" in fridge_items:
        return fridge_items["error"]

    if recipe_type == "Menü":
        return generate_menu(fridge_items, cuisine_type)
    else:
        return generate_recipes(fridge_items, cuisine_type, recipe_type)


def create_recipe_tab():
    with gr.Tab("Tarifler"):
        with gr.Row():
            with gr.Column(scale=1):
                cuisine_type = gr.Radio(
                    ["Türk", "Fransız", "Japon"], label="Mutfak Türü"
                )
                recipe_type = gr.Radio(
                    ["Menü", "Ana Yemek", "Meze", "Tatlı", "Yan Yemek"],
                    label="Tarif Türü",
                )
                generate_btn = gr.Button("Tarif Oluştur")

            with gr.Column(scale=2):
                recipe_output = gr.Markdown()

        generate_btn.click(
            fn=generate_recipes_ui,
            inputs=[cuisine_type, recipe_type],
            outputs=recipe_output,
        )
    return recipe_output


def create_shopping_tab():
    with gr.Tab("Alışveriş Listesi"):
        with gr.Row():
            with gr.Column(scale=1):
                meal_count = gr.Slider(
                    minimum=1,
                    maximum=7,
                    value=3,
                    step=1,
                    label="Kaç günlük yemek planı için alışveriş listesi oluşturulsun?",
                )
                generate_btn = gr.Button("Liste Oluştur")

            with gr.Column(scale=2):
                shopping_output = gr.Markdown()

        generate_btn.click(
            fn=lambda x: generate_shopping_list(fetch_fridge_items(), x),
            inputs=[meal_count],
            outputs=shopping_output,
        )
    return shopping_output


# Create Gradio interface with tabs
with gr.Blocks(title="Kişisel Asistan - Mutfak Yardımcısı") as iface:
    gr.Markdown("## Buzdolabı Asistanı")
    gr.Markdown(
        "Buzdolabınızdaki malzemelere göre tarifler oluşturur ve alışveriş listesi hazırlar."
    )

    with gr.Tabs():
        recipe_output = create_recipe_tab()
        shopping_output = create_shopping_tab()

if __name__ == "__main__":
    iface.launch()
