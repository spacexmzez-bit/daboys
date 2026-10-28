# Daboys

A small, dark-themed hangout payment tracker built with **HTML, CSS, and vanilla JavaScript**. Currency: **Saudi riyals (SAR)**.

## Put it on GitHub Pages

Upload these three files to the root of your GitHub repository:

- `index.html`
- `styles.css`
- `app.js`

If GitHub Pages is not already enabled, go to your repository **Settings → Pages**, select **Deploy from a branch**, choose your branch and **/(root)**, and save. No build tools, dependencies, database, or secrets are needed.

You can also open `index.html` locally in a browser.

## How it works

1. Open **Members & Settings** and add permanent members by name, or use the quick-add field while creating a hangout.
2. Create a **New hangout**, enter the total bill, select saved members, and/or add temporary members. Temporary members exist only within that hangout.
3. Each person's share is calculated in **halalas** (1 SAR = 100 halalas). Any remainder is distributed one halala at a time so the shares add up to the exact bill.
4. Record what each person paid and their method (**Cash**, **PoS**, or **Direct Transfer**). Entering a payment amount **does not mark the person done**; the checkbox is the only way. Checking the box automatically fills any unpaid share, but preserves overpayments. Unchecking leaves the amount as-is.
5. If someone pays more than their share, Daboys creates an **automatic debt owed to that person**, initially assigned to the **group/shared pool**. Edit the debt to assign a specific debtor or change the amount. You can also create independent manual debts. Settle debts with the quick buttons or a custom amount.
6. Once **every member is checked done** and **every debt is fully settled**, use **Complete hangout**. Confirming permanently removes the hangout, its payments, debts, and temporary members. Permanent members remain.

### Debt details

- Automatic debts are based on the overpayment amount, not an automatic redistribution of other members' shares.
- Editing an automatic debt amount preserves your override even if the member's payment later changes. To reset the automatic calculation, change that member's payment to their share or less, then enter the new overpayment.
- Deleting an automatic debt dismisses it for that overpayment. To create a new automatic debt for the member, first lower their payment to their share or less, then record the overpayment again.
- Settlements are entered manually. The app does **not** move money or connect to a bank.
- Completing a hangout is irreversible; there is no archive.

## Data & backups

**All app data is saved in your browser's `localStorage` on your device, not on GitHub or a remote server.** It persists across normal page reloads on the same browser and site origin, but **does not sync** between browsers or devices. Private/incognito browsing and clearing site data can remove it.

**Members & Settings → Export JSON** downloads **only permanent member names**. **Import JSON** merges names (case-insensitive), skipping duplicates; it does not import hangouts or debts. Accepted formats:

```json
{"members":[{"name":"Ahmed"},{"name":"محمد"}]}
```

or a simple array:

```json
["Ahmed", "محمد"]
```

> **Important:** This member export is not a backup of active hangouts, payments, or debts. Keep your browser data intact while any hangouts are active.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Page layout and navigation |
| `styles.css` | Responsive dark theme |
| `app.js` | Payment splitting, members, debts, storage, and interactions |

No third-party scripts, fonts, frameworks, or tracking services are used.
