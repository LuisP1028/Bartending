# FS83 — Multi-character spawn with seat + identity exclusivity

## Purpose

Spawn **multiple** bar characters under:

1. Count ≤ number of seats  
2. One character per seat  
3. No two living instances of the same character id  

Aligns with FS51 auto-fill capacity and FS53 exclusivity; product now authorized to implement.

## Correct required outputs

- O1: Up to 4 patrons can be on stage when 4 seats free and enough unique ids  
- O2: Never more patrons than seats  
- O3: No two share a seatId  
- O4: No two share a characterId  
- O5: When full, no further spawns  

## Non-goals (this FS)

- Walk-away / leave (optional later)  
- Sit-complete order print (FS51 remainder)
