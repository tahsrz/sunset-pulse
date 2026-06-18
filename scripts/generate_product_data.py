import pandas as pd
import json
import random

def generate_retail_dataset():
    # Base products typical for a Texas Gas Station / Grill
    products = [
        {"name": "Doritos Nacho Cheese", "category": "Snacks", "base_vol": 8500},
        {"name": "Cheetos Flamin' Hot", "category": "Snacks", "base_vol": 9200},
        {"name": "Takis Fuego", "category": "Snacks", "base_vol": 11500},
        {"name": "Red Bull 8oz", "category": "Beverages", "base_vol": 14200},
        {"name": "Monster Energy Green", "category": "Beverages", "base_vol": 13800},
        {"name": "Gatorade Cool Blue", "category": "Beverages", "base_vol": 9800},
        {"name": "Coca-Cola 20oz", "category": "Beverages", "base_vol": 18500},
        {"name": "Dr Pepper 20oz", "category": "Beverages", "base_vol": 21000}, # Texas favorite
        {"name": "Topo Chico", "category": "Beverages", "base_vol": 10500},
        {"name": "Brisket Taco", "category": "Grill", "base_vol": 6400},
        {"name": "Sausage Kolache", "category": "Grill", "base_vol": 8900},
        {"name": "Breakfast Burrito", "category": "Grill", "base_vol": 7200},
        {"name": "Slim Jim Giant", "category": "Snacks", "base_vol": 5300},
        {"name": "Jack Link's Teriyaki", "category": "Snacks", "base_vol": 4800},
        {"name": "Reese's Cups", "category": "Candy", "base_vol": 9100},
        {"name": "Snickers", "category": "Candy", "base_vol": 8700},
        {"name": "M&M's Peanut", "category": "Candy", "base_vol": 8400},
        {"name": "Orbit Peppermint", "category": "Candy", "base_vol": 3200},
        {"name": "Marlboro Red", "category": "Tobacco", "base_vol": 15600},
        {"name": "Zyn Wintergreen 6mg", "category": "Tobacco", "base_vol": 19400},
        {"name": "Buc-ee's Beaver Nuggets (Competitor)", "category": "Snacks", "base_vol": 25000},
        {"name": "Fritos Chili Cheese", "category": "Snacks", "base_vol": 6100},
        {"name": "Sprite 20oz", "category": "Beverages", "base_vol": 12400},
        {"name": "Mountain Dew", "category": "Beverages", "base_vol": 11200},
    ]

    # Convert to DataFrame for processing
    df = pd.DataFrame(products)

    # Introduce some realistic noise/variance using Pandas
    df['monthly_sales'] = df['base_vol'].apply(lambda x: int(x * random.uniform(0.85, 1.15)))
    df['id'] = df['name'].str.lower().str.replace(r'[^a-z0-9]+', '-', regex=True).str.strip('-')

    # Drop base_vol and sort by category just for organization
    df = df.drop(columns=['base_vol']).sort_values(['category', 'monthly_sales'], ascending=[True, False])

    # Export to JSON for the Next.js frontend to consume
    output_path = 'apps/pulse/lib/data/product_popularity.json'
    
    # Save the dataframe records to json
    records = df.to_dict(orient='records')
    with open(output_path, 'w') as f:
        json.dump(records, f, indent=2)
        
    print(f"✅ Generated {len(df)} products and saved to {output_path}")

if __name__ == '__main__':
    generate_retail_dataset()
