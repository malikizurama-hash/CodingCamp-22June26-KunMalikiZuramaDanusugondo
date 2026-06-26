// Expense & Budget Visualizer — js/app.js

// --- State & Constants ---

const AppState = {
  transactions: [],
  currentSort: 'newest',
  currentTheme: 'light',
  storageAvailable: true,
  chartInstance: null,
  budgetLimit: 0, // 0 = tidak aktif
};

const STORAGE_KEYS = {
  TRANSACTIONS: 'ebv_transactions',
  THEME: 'ebv_theme',
  LIMIT: 'ebv_limit',
};

// --- Utility Functions ---

/**
 * Format number string with dot thousands separator for display.
 * "10000" → "10.000", "1000000" → "1.000.000"
 * @param {string} raw - digits only string
 * @returns {string}
 */
function formatThousands(raw) {
  if (!raw) return '';
  // Remove existing dots, keep only digits
  const digits = raw.replace(/\./g, '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Strip thousands dots and return plain numeric string.
 * "10.000" → "10000"
 * @param {string} formatted
 * @returns {string}
 */
function stripThousands(formatted) {
  return (formatted ?? '').replace(/\./g, '');
}

/**
 * Attach auto-formatting (dot thousands separator) to a text input.
 * Preserves cursor position as best as possible.
 * @param {HTMLInputElement} input
 */
function attachThousandsFormatter(input) {
  input.addEventListener('input', () => {
    const raw = stripThousands(input.value);
    const digits = raw.replace(/\D/g, '');
    const formatted = formatThousands(digits);
    input.value = formatted;
  });
}


function generateId() {
  return `ebv_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Format a number as Indonesian Rupiah currency string.
 * @param {number} amount - Non-negative number to format
 * @returns {string} Formatted string, e.g. "Rp 1.250.000"
 */
function formatCurrency(amount) {
  const rounded = Math.round(amount);
  // Use toLocaleString with 'id-ID' locale which uses dot as thousands separator
  const formatted = rounded.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `Rp ${formatted}`;
}

/**
 * Validate form data before creating a transaction.
 * Collects ALL errors (does not short-circuit after first failure).
 *
 * @param {{ name: string, amount: any, category: string }} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateForm(data) {
  const errors = [];

  // Validate name: must not be empty or whitespace-only
  const trimmedName = (data.name ?? '').trim();
  if (trimmedName.length === 0) {
    errors.push('Item Name tidak boleh kosong.');
  }

  // Validate amount: must be a valid number, > 0, and <= 9_999_999_999.99
  const parsedAmount = parseFloat(data.amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    errors.push('Amount harus berupa angka positif lebih dari nol.');
  } else if (parsedAmount > 9_999_999_999.99) {
    errors.push('Amount tidak boleh melebihi 9.999.999.999,99.');
  }

  // Validate category: must be exactly one of the allowed values
  const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];
  if (!VALID_CATEGORIES.includes(data.category)) {
    errors.push('Category harus salah satu dari: Food, Transport, Fun.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate the total balance from an array of transactions.
 *
 * @param {Transaction[]} transactions
 * @returns {number} Sum of all transaction amounts, or 0 for an empty array
 */
function calculateBalance(transactions) {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

// --- Storage Functions ---

/**
 * Show a persistent warning banner when storage is unavailable.
 * Removes the 'hidden' class from #storage-banner.
 */
function showStorageError() {
  const banner = document.getElementById('storage-banner');
  if (banner) {
    banner.classList.remove('hidden');
  }
}

/**
 * Read and parse transactions from localStorage.
 * - Returns [] and sets AppState.storageAvailable = false if localStorage is not accessible.
 * - Returns [] and removes the corrupted key if JSON.parse fails.
 * @returns {Transaction[]} Array of transaction objects, or empty array on failure.
 */
function readStorage() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  } catch (e) {
    AppState.storageAvailable = false;
    return [];
  }

  if (raw === null) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    return [];
  }
}

/**
 * Serialize and persist transactions to localStorage.
 * Silently skips if AppState.storageAvailable is false.
 * On write failure, sets AppState.storageAvailable = false and shows the storage error banner.
 * @param {Transaction[]} transactions - Array of transaction objects to persist.
 */
function writeStorage(transactions) {
  if (!AppState.storageAvailable) return;
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (e) {
    AppState.storageAvailable = false;
    showStorageError();
  }
}

/**
 * Aggregate transaction amounts by category.
 * Categories with a total of 0 are excluded from the result.
 *
 * @param {Transaction[]} transactions - Array of transaction objects
 * @returns {CategoryTotals} Object with only categories that have total > 0
 *
 * @example
 * aggregateByCategory([
 *   { category: 'Food', amount: 25000 },
 *   { category: 'Food', amount: 15000 },
 *   { category: 'Transport', amount: 10000 },
 * ]);
 * // => { Food: 40000, Transport: 10000 }
 */
function aggregateByCategory(transactions) {
  /** @type {CategoryTotals} */
  const totals = {};

  for (const transaction of transactions) {
    const { category, amount } = transaction;
    totals[category] = (totals[category] || 0) + amount;
  }

  // Remove categories with total === 0 (Requirements 4.1, 4.6)
  for (const category of Object.keys(totals)) {
    if (totals[category] === 0) {
      delete totals[category];
    }
  }

  return totals;
}

/**
 * Sort a copy of the transactions array by the given mode.
 * The original array is never mutated.
 *
 * @param {Transaction[]} transactions - Array of transaction objects to sort
 * @param {string} mode - Sorting mode:
 *   'amount-high'  → descending amount; tiebreaker: date descending (newest first)
 *   'amount-low'   → ascending amount;  tiebreaker: date descending (newest first)
 *   'category-az'  → ascending category (A–Z, lexicographic)
 *   'newest'       → descending date (newest first) — also the default for unknown modes
 * @returns {Transaction[]} A new sorted array (shallow copy)
 */
function sortTransactions(transactions, mode) {
  const copy = [...transactions];

  switch (mode) {
    case 'amount-high':
      copy.sort((a, b) => {
        if (b.amount !== a.amount) return b.amount - a.amount;
        // tiebreaker: newest first
        return new Date(b.date) - new Date(a.date);
      });
      break;

    case 'amount-low':
      copy.sort((a, b) => {
        if (a.amount !== b.amount) return a.amount - b.amount;
        // tiebreaker: newest first
        return new Date(b.date) - new Date(a.date);
      });
      break;

    case 'category-az':
      copy.sort((a, b) => {
        if (a.category < b.category) return -1;
        if (a.category > b.category) return  1;
        return 0;
      });
      break;

    case 'newest':
    default:
      // newest first (also handles unknown modes)
      copy.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
  }

  return copy;
}

/**
 * Render the current balance to the #balance-display element.
 * Also updates budget limit indicator if limit is set.
 */
function renderBalance() {
  const balance = calculateBalance(AppState.transactions);
  const display = document.getElementById('balance-display');
  if (display) {
    display.textContent = formatCurrency(balance);
  }

  // Budget limit indicator
  const indicator = document.getElementById('budget-limit-indicator');
  if (indicator) {
    if (AppState.budgetLimit > 0) {
      const exceeded = balance > AppState.budgetLimit;
      indicator.textContent = exceeded
        ? `⚠ Total melebihi limit ${formatCurrency(AppState.budgetLimit)}!`
        : `Limit: ${formatCurrency(AppState.budgetLimit)} (sisa: ${formatCurrency(AppState.budgetLimit - balance)})`;
      indicator.className = exceeded ? 'budget-indicator budget-exceeded' : 'budget-indicator budget-ok';
      indicator.classList.remove('hidden');
    } else {
      indicator.classList.add('hidden');
    }
  }

  // Sync limit input value to reflect current state
  const limitInput = document.getElementById('input-budget-limit');
  if (limitInput && document.activeElement !== limitInput) {
    limitInput.value = AppState.budgetLimit > 0 ? formatThousands(String(AppState.budgetLimit)) : '';
  }
}

/**
 * Set budget limit from input, persist to localStorage.
 * @param {string} rawValue - raw string from input
 */
function setBudgetLimit(rawValue) {
  const parsed = parseFloat(rawValue);
  AppState.budgetLimit = (!isNaN(parsed) && parsed > 0) ? parsed : 0;
  if (AppState.storageAvailable) {
    try {
      localStorage.setItem(STORAGE_KEYS.LIMIT, String(AppState.budgetLimit));
    } catch (e) { /* silent */ }
  }
  renderAll();
}

/**
 * Render the transaction list into #transaction-list.
 * Applies the active sort from AppState.currentSort and highlights
 * items with amount > 500000 with the class `highlight-high`.
 * Shows "Belum ada transaksi." when the list is empty.
 */
function renderTransactionList() {
  const list = document.getElementById('transaction-list');
  if (!list) return;

  const sorted = sortTransactions(AppState.transactions, AppState.currentSort);

  if (sorted.length === 0) {
    list.innerHTML = '<li class="empty-message">Belum ada transaksi.</li>';
    return;
  }

  // Clear existing content
  list.innerHTML = '';

  for (const t of sorted) {
    const li = document.createElement('li');
    li.classList.add('transaction-item');
    if (t.amount > 500000) {
      li.classList.add('highlight-high');
    }
    // Budget limit highlight — overrides highlight-high visually via CSS specificity
    if (AppState.budgetLimit > 0 && t.amount > AppState.budgetLimit) {
      li.classList.add('highlight-limit');
    }

    // Item name — set via textContent to prevent XSS
    const nameSpan = document.createElement('span');
    nameSpan.classList.add('transaction-name');
    nameSpan.textContent = t.name;

    // Formatted amount
    const amountSpan = document.createElement('span');
    amountSpan.classList.add('transaction-amount');
    amountSpan.textContent = formatCurrency(t.amount);

    // Category badge — set via textContent to prevent XSS
    const categorySpan = document.createElement('span');
    categorySpan.classList.add('category-badge');
    categorySpan.textContent = t.category;

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('btn-delete');
    deleteBtn.dataset.id = t.id;
    deleteBtn.textContent = 'Hapus';

    li.appendChild(nameSpan);
    li.appendChild(amountSpan);
    li.appendChild(categorySpan);
    li.appendChild(deleteBtn);

    list.appendChild(li);
  }
}

/**
 * Re-render all UI components in one synchronised cycle.
 * Always call this after any mutation to AppState.transactions.
 */
function renderAll() {
  renderBalance();
  renderTransactionList();
  renderChart();
}

/**
 * Validate, persist, and render a new transaction from raw form data.
 *
 * @param {{ name: string, amount: string, category: string }} data - Raw string values from form inputs
 */
function addTransaction(data) {
  const result = validateForm(data);

  const formError = document.getElementById('form-error');

  if (!result.valid) {
    if (formError) {
      formError.textContent = result.errors.join(' ');
    }
    return;
  }

  // Clear any previous error
  if (formError) {
    formError.textContent = '';
  }

  // Build and store the new transaction
  const transaction = {
    id: generateId(),
    name: data.name.trim(),
    amount: parseFloat(data.amount),
    category: data.category,
    date: new Date().toISOString(),
  };

  AppState.transactions.push(transaction);
  writeStorage(AppState.transactions);
  renderAll();

  // Reset form fields
  const nameInput = document.getElementById('input-name');
  const amountInput = document.getElementById('input-amount');
  const categoryInput = document.getElementById('input-category');

  if (nameInput) nameInput.value = '';
  if (amountInput) amountInput.value = '';
  if (categoryInput) categoryInput.value = '';
}

/**
 * Remove a transaction by its unique ID, then persist and re-render.
 *
 * @param {string} id - The `id` of the transaction to delete
 */
function deleteTransaction(id) {
  AppState.transactions = AppState.transactions.filter(t => t.id !== id);
  writeStorage(AppState.transactions);
  renderAll();
}

// --- Chart Constants ---

/**
 * Consistent color mapping per category.
 */
const CATEGORY_COLORS = {
  Food: '#4CAF50',
  Transport: '#2196F3',
  Fun: '#FF9800',
};

// --- Chart Rendering ---

/**
 * Render or update the expense pie/doughnut chart.
 *
 * Behavior:
 * - If window.Chart is undefined (CDN failed to load), show a fallback message
 *   in #chart-container and return early.
 * - Calls aggregateByCategory(AppState.transactions) to get per-category totals.
 * - If there is no data (all categories zero / no transactions):
 *     • Shows #chart-empty-message (removes 'hidden' class)
 *     • Hides #expense-chart canvas (adds 'hidden' class)
 *     • Destroys existing Chart.js instance if any and sets AppState.chartInstance = null
 * - If there is data:
 *     • Hides #chart-empty-message (adds 'hidden' class)
 *     • Shows #expense-chart canvas (removes 'hidden' class)
 *     • Creates a new Chart.js doughnut instance if none exists, or updates
 *       labels / data / colors and calls chart.update() on the existing instance.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */
function renderChart() {
  // 1. Guard: Chart.js not loaded from CDN
  if (typeof window.Chart === 'undefined') {
    const container = document.getElementById('chart-container');
    if (container) {
      container.innerHTML =
        '<p class="chart-fallback-message">Chart tidak tersedia. Gagal memuat Chart.js dari CDN.</p>';
    }
    return;
  }

  // 2. Aggregate transactions by category
  const totals = aggregateByCategory(AppState.transactions);

  // 3. Extract labels and values
  const labels = Object.keys(totals);
  const data = Object.values(totals);

  // 4. Map labels to consistent colors
  const colors = labels.map((label) => CATEGORY_COLORS[label] ?? '#999999');

  // 5. DOM references
  const canvas = document.getElementById('expense-chart');
  const emptyMessage = document.getElementById('chart-empty-message');

  // 6. No data case
  if (labels.length === 0) {
    if (emptyMessage) emptyMessage.classList.remove('hidden');
    if (canvas) canvas.classList.add('hidden');

    if (AppState.chartInstance) {
      AppState.chartInstance.destroy();
      AppState.chartInstance = null;
    }
    return;
  }

  // 7. Data exists case
  if (emptyMessage) emptyMessage.classList.add('hidden');
  if (canvas) canvas.classList.remove('hidden');

  if (!AppState.chartInstance) {
    // Create new Chart.js instance
    AppState.chartInstance = new window.Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
          },
        },
      },
    });
  } else {
    // Update existing instance without rebuilding
    const chart = AppState.chartInstance;
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].backgroundColor = colors;
    chart.update();
  }
}

// --- Event Listeners ---

/**
 * Set up all DOM event listeners for the application.
 * Called once from init() after the DOM is ready.
 *
 * Covers:
 * - Form submit    (#transaction-form)   — Requirements 2.5
 * - Delete button  (#transaction-list)   — Requirements 3.4
 * - Sort control   (#sort-control)       — Requirements 6.2
 * - Theme toggle   (#theme-toggle)       — Requirements 5.1
 */
function initEventListeners() {
  // 1. Form submit — validate and add a new transaction
  const form = document.getElementById('transaction-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('input-name')?.value ?? '';
      const amount = stripThousands(document.getElementById('input-amount')?.value ?? '');
      const category = document.getElementById('input-category')?.value ?? '';
      addTransaction({ name, amount, category });
    });
  }

  // 2. Delete delegation — click anywhere inside #transaction-list,
  //    but only act when the target is a delete button (has class btn-delete
  //    or carries a data-id attribute).
  const list = document.getElementById('transaction-list');
  if (list) {
    list.addEventListener('click', (e) => {
      const target = e.target;
      if (target.classList.contains('btn-delete') || target.dataset.id) {
        const id = target.dataset.id;
        if (id) {
          deleteTransaction(id);
        }
      }
    });
  }

  // 3. Sort control — update AppState and re-render the list
  const sortControl = document.getElementById('sort-control');
  if (sortControl) {
    sortControl.addEventListener('change', (e) => {
      AppState.currentSort = e.target.value;
      renderTransactionList();
    });
  }

  // 4. Theme toggle — delegate to toggleTheme() (defined in task 10.2)
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      toggleTheme();
    });
  }

  // 5. Budget limit — set on form submit or Enter
  const limitForm = document.getElementById('budget-limit-form');
  if (limitForm) {
    limitForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = stripThousands(document.getElementById('input-budget-limit')?.value ?? '');
      setBudgetLimit(val);
    });
  }

  // 6. Auto thousands separator on amount and budget limit inputs
  const amountInputEl = document.getElementById('input-amount');
  const limitInputEl = document.getElementById('input-budget-limit');
  if (amountInputEl) attachThousandsFormatter(amountInputEl);
  if (limitInputEl) attachThousandsFormatter(limitInputEl);
}

// --- Theme ---

/**
 * Toggle between light and dark theme.
 *
 * 1. Flips AppState.currentTheme between 'light' and 'dark'.
 * 2. Adds or removes the `dark` class on <body>.
 * 3. Persists the preference to localStorage under STORAGE_KEYS.THEME.
 * 4. Updates the #theme-toggle button label to indicate the NEXT action:
 *    - When dark mode is active  → "☀ Light Mode"  (click to go back to light)
 *    - When light mode is active → "🌙 Dark Mode"  (click to switch to dark)
 *
 * Requirements: 5.2, 5.3, 5.4, 5.6
 */
function toggleTheme() {
  // 1. Flip theme
  AppState.currentTheme = AppState.currentTheme === 'light' ? 'dark' : 'light';

  // 2. Apply/remove dark class on <body>
  if (AppState.currentTheme === 'dark') {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }

  // 3. Persist preference to localStorage
  if (AppState.storageAvailable) {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, AppState.currentTheme);
    } catch (e) {
      AppState.storageAvailable = false;
      showStorageError();
    }
  }

  // 4. Update #theme-toggle button label
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.textContent =
      AppState.currentTheme === 'dark' ? '☀ Light Mode' : '🌙 Dark Mode';
  }
}

// --- Initialization ---

/**
 * Initialize the application.
 *
 * Execution order:
 * 1. Read and apply saved theme preference BEFORE rendering to prevent flash.
 * 2. Load transactions from localStorage.
 * 3. Set default sort order.
 * 4. Wire up all DOM event listeners.
 * 5. Render the initial UI state.
 *
 * Requirements: 1.6, 3.1, 5.5, 8.3, 8.4
 */
function init() {
  // 1. Apply saved theme before any rendering to avoid theme flash (Requirement 5.5)
  let savedTheme = 'light';
  try {
    savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  } catch (e) {
    AppState.storageAvailable = false;
  }
  AppState.currentTheme = savedTheme;
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
  }

  // Update theme toggle button label to reflect active theme
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.textContent =
      savedTheme === 'dark' ? '☀ Light Mode' : '🌙 Dark Mode';
  }

  // 2. Load persisted transactions into AppState (Requirements 3.1, 8.3)
  AppState.transactions = readStorage();

  // 2b. Load persisted budget limit
  try {
    const savedLimit = localStorage.getItem(STORAGE_KEYS.LIMIT);
    if (savedLimit !== null) {
      const parsed = parseFloat(savedLimit);
      AppState.budgetLimit = (!isNaN(parsed) && parsed > 0) ? parsed : 0;
    }
  } catch (e) { /* silent */ }

  // 3. Set default sort order (Requirement 6.5)
  AppState.currentSort = 'newest';

  // 4. Wire up all DOM event listeners
  initEventListeners();

  // 5. Render initial UI state (Requirements 1.6, 8.4)
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
