# Kişisel Asistan - Tarif Üretici

Bu proje, buzdolabınızdaki malzemeleri kullanarak çeşitli tarifler oluşturmanıza yardımcı olan bir kişisel asistandır. Gradio arayüzü kullanılarak, farklı tarif türleri (Ana Yemek, Meze, Tatlı, Yan Yemek) için tarifler oluşturabilirsiniz.

## Özellikler

- Buzdolabınızdaki malzemeleri alır ve tarifler oluşturur.
- Ana Yemek, Meze, Tatlı ve Yan Yemek kategorilerinde tarifler oluşturabilir.
- Tarifler detaylı ve adım adım açıklamalı olarak sunulur.
- Tarifler Markdown formatında görüntülenir.
- Migros API'sinden veri çekerek buzdolabı malzemelerini günceller.

## Kurulum

1. Bu projeyi klonlayın:
    ```bash
    git clone https://github.com/Winvoker/B2Chef
    cd smart_home
    ```

2. Gerekli Python paketlerini yükleyin:
    ```bash
    pip install -r requirements.txt
    ```

3. `.env` dosyasını oluşturun ve API anahtarınızı ekleyin:
    ```env
    API_KEY=your_api_key_here
    ```

## Kullanım

1. Flask uygulamasını başlatın:
    ```bash
    python smart-kitchen/app.py
    ```

2. Gradio arayüzünü başlatın:
    ```bash
    python llm_ui.py
    ```

3. Tarayıcınızda açılan Gradio arayüzünde, tarif türünü seçin ve "Submit" butonuna tıklayın.

## API Endpoints

- `/`: Ana sayfa, buzdolabındaki malzemeleri ve kategorileri listeler.
- `/add`: Yeni bir malzeme ekler. (POST)
- `/remove`: Bir malzemeyi kaldırır. (POST)
- `/remove_all`: Bir kategorideki tüm malzemeleri kaldırır. (POST)
- `/update_migros`: Migros API'sinden en son malzemeyi ekler. (POST)
- `/items`: Buzdolabındaki tüm malzemeleri JSON formatında döner. (GET)

## Dosya Yapısı

- `llm_ui.py`: Gradio arayüzünü oluşturur ve tarif oluşturma işlemlerini yönetir.
- `generation.py`: Tarif oluşturma işlemlerini gerçekleştiren fonksiyonları içerir.
- `smart-kitchen/app.py`: Flask uygulamasını içerir ve buzdolabı malzemelerini yönetir.

## Katkıda Bulunma

Katkıda bulunmak isterseniz, lütfen bir pull request gönderin veya bir issue açın.

## Lisans

Bu proje MIT Lisansı ile lisanslanmıştır. Daha fazla bilgi için `LICENSE` dosyasına bakın.