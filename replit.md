# MedSwift — 10-Minute Medicine Delivery App

## Overview
A hyper-local medicine delivery mobile app built with Expo React Native. Customers can browse pharmacies, search medicines, manage a cart with prescription upload gating, and track orders in real time.

## Stack
- **Frontend**: Expo Router (file-based routing), React Native
- **Backend**: Express.js (TypeScript) on port 5000
- **State**: React Context + AsyncStorage (local persistence)
- **Server State**: @tanstack/react-query
- **Font**: DM Sans (@expo-google-fonts/dm-sans)
- **Theme**: Dark navy (#0A1628) + teal (#00B4A0) accent

## Key Features
- Home screen with pharmacy cards, medicine categories, hero banner
- Browse/Search medicines by category and name with Rx flags
- Cart with:
  - Prescription upload gate (required before checkout for Rx items)
  - Cold chain alerts for insulin/temperature-sensitive medicines
  - Schedule X drug "ID at delivery" enforcement
- Orders tab with live status tracker (5 stages)
- Profile screen with stats, address, settings

## App Structure
```
app/
  _layout.tsx          # Root layout with providers and font loading
  (tabs)/
    _layout.tsx        # 5-tab layout (NativeTabs + Classic fallback)
    index.tsx          # Home screen
    search.tsx         # Browse/search medicines
    cart.tsx           # Cart with prescription upload
    orders.tsx         # Order history + tracking
    profile.tsx        # User profile + settings
context/
  CartContext.tsx       # Cart state + prescription URI
  OrdersContext.tsx     # Orders state + status simulation
data/
  medicines.ts         # Sample medicines, pharmacies, categories
constants/
  colors.ts            # Dark navy + teal theme
server/
  index.ts             # Express server
  routes.ts            # API routes
  storage.ts           # Storage helpers
```

## Medicine Safety Features
- `isPrescriptionRequired`: Locks checkout until prescription photo uploaded
- `isScheduleX`: Shows "ID at delivery" warning + Alert before ordering
- `requiresColdChain`: Shows blue cold-chain badge + delivery alert
- Generic name displayed for all medicines (substitute awareness)

## Workflows
- `Start Backend`: `npm run server:dev` — Express server on port 5000
- `Start Frontend`: `npm run expo:dev` — Expo dev server on port 8081

## User Preferences
- Dark mode UI enforced
- DM Sans font throughout
