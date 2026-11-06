# FreshMart Supermarket

A responsive supermarket e-commerce starter built with HTML, CSS, JavaScript, Node.js and Express.

## Included features
- Responsive supermarket homepage inspired by the supplied reference
- Automatic hero slideshow
- Product catalogue with search, category, order-type, price and sort filters
- Add-to-cart, quantity updates and cart saved in the browser
- Customer registration and login (passwords hashed with bcrypt)
- Checkout and order creation (demo flow; no real payment is collected)
- Order tracking by order number
- Store opening hours display
- About, FAQ and contact sections
- Basic automated support chat for common questions

## Requirements
- Node.js 18 or newer
- Internet connection for Google Fonts and the sample product photographs

## Run on Windows (beginner steps)
1. Extract `freshmart-supermarket.zip`.
2. Open the extracted `freshmart-supermarket` folder in VS Code.
3. In VS Code, select **Terminal → New Terminal**.
4. Confirm the terminal is inside the folder that contains `package.json`.
5. Run:

   ```powershell
   npm install
   ```

6. Copy `.env.example` and rename the copy to `.env`. You can do this in VS Code Explorer.
7. Open `.env` and change `SESSION_SECRET` to a long random phrase.
8. Start the website:

   ```powershell
   npm start
   ```

9. Open `http://localhost:3000` in Chrome.

To stop the server, click the terminal and press `Ctrl + C`.

## Where your data is stored
The backend creates `backend/data/store.json` automatically. It stores registered customer records (passwords are hashed) and orders. Keep this file private and include it in your backups. Do not upload `.env` or real customer data to a public GitHub repository.

## Payment note — important
Checkout currently creates a **demo order only**. It does not collect card details, debit an account, or confirm a real payment. Before accepting real orders, integrate Paystack or Flutterwave on the server using your own merchant account and private secret key. Never put a payment secret key in frontend JavaScript or commit it to GitHub.

## Before launching publicly
- Replace sample product photographs, product details, prices, business address, phone and email with the supermarket's real information.
- Add HTTPS and a persistent production session store.
- Configure secure cookies and production environment variables.
- Add delivery zones, tax/receipt rules, stock management and order-management/admin tools.
- Integrate and test a real payment provider and webhook verification.
- Add a privacy policy, terms, returns policy and appropriate legal notices.
- Use a production database such as PostgreSQL rather than the starter JSON file for a high-volume store.
