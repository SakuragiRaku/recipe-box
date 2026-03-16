// app.js - レシピボックス

(() => {
  'use strict';

  // ============================================================
  // 定数
  // ============================================================
  const STORAGE_KEY = 'recipe-box-recipes';
  const SHOPPING_KEY = 'recipe-box-shopping';
  const THEME_KEY = 'recipe-box-theme';

  const CATEGORIES = {
    main: { label: '主菜', icon: '🍖', color: '#e8734a' },
    side: { label: '副菜', icon: '🥗', color: '#5bb563' },
    soup: { label: '汁物', icon: '🍲', color: '#4a9be8' },
    rice: { label: 'ごはん', icon: '🍚', color: '#e8c74a' },
    noodle: { label: '麺類', icon: '🍜', color: '#e85050' },
    salad: { label: 'サラダ', icon: '🥬', color: '#7bc67b' },
    dessert: { label: 'デザート', icon: '🍰', color: '#e87baf' },
    other: { label: 'その他', icon: '📝', color: '#9e9790' },
  };

  const DIFFICULTIES = {
    easy: 'かんたん',
    normal: 'ふつう',
    hard: 'こだわり',
  };

  // ============================================================
  // データ管理
  // ============================================================
  function loadRecipes() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }

  function saveRecipes(recipes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  }

  function loadShopping() {
    try { return JSON.parse(localStorage.getItem(SHOPPING_KEY)) || { selected: [], checked: [] }; }
    catch { return { selected: [], checked: [] }; }
  }

  function saveShopping(data) {
    localStorage.setItem(SHOPPING_KEY, JSON.stringify(data));
  }

  let recipes = loadRecipes();
  let shoppingData = loadShopping();
  let currentFilter = 'all';
  let currentSearch = '';
  let editingId = null;
  let viewingId = null;
  let searchIngredients = [];

  // ============================================================
  // テーマ
  // ============================================================
  const themeBtn = document.getElementById('theme-btn');
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    themeBtn.textContent = saved === 'dark' ? '☀️' : '🌙';
  }

  themeBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    themeBtn.textContent = next === 'dark' ? '☀️' : '🌙';
  });

  initTheme();

  // ============================================================
  // ナビゲーション
  // ============================================================
  const navBtns = document.querySelectorAll('.nav-btn');
  const pages = document.querySelectorAll('.page');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      pages.forEach(p => {
        p.classList.remove('active');
        if (p.id === `page-${page}`) p.classList.add('active');
      });
      if (page === 'shopping') renderShopping();
    });
  });

  // ============================================================
  // レシピ一覧
  // ============================================================
  const recipeGrid = document.getElementById('recipe-grid');
  const emptyRecipes = document.getElementById('empty-recipes');
  const recipeSearch = document.getElementById('recipe-search');
  const categoryTabs = document.getElementById('category-tabs');

  function getFilteredRecipes() {
    return recipes.filter(r => {
      const catMatch = currentFilter === 'all' || r.category === currentFilter;
      const searchMatch = !currentSearch || r.name.toLowerCase().includes(currentSearch.toLowerCase());
      return catMatch && searchMatch;
    });
  }

  function renderRecipes() {
    const filtered = getFilteredRecipes();
    recipeGrid.innerHTML = '';

    if (filtered.length === 0) {
      recipeGrid.style.display = 'none';
      emptyRecipes.classList.remove('hidden');
      if (recipes.length > 0) {
        emptyRecipes.querySelector('.empty-text').textContent = '該当するレシピがありません';
        emptyRecipes.querySelector('.empty-sub').textContent = 'フィルターや検索条件を変更してみてください';
      } else {
        emptyRecipes.querySelector('.empty-text').textContent = 'レシピがまだありません';
        emptyRecipes.querySelector('.empty-sub').textContent = '下のボタンから最初のレシピを追加しましょう！';
      }
      return;
    }

    recipeGrid.style.display = '';
    emptyRecipes.classList.add('hidden');

    filtered.forEach(recipe => {
      const card = document.createElement('div');
      card.className = 'recipe-card';
      card.dataset.cat = recipe.category;

      const cat = CATEGORIES[recipe.category] || CATEGORIES.other;
      const ingText = recipe.ingredients.map(i => i.name).join('、');

      card.innerHTML = `
        <div class="card-name">${escapeHtml(recipe.name)}</div>
        <div class="card-meta">
          <span class="card-badge" style="background:${cat.color}20;color:${cat.color}">${cat.icon} ${cat.label}</span>
          <span>⏱ ${recipe.cookTime}分</span>
          <span>${DIFFICULTIES[recipe.difficulty] || ''}</span>
        </div>
        <div class="card-ingredients">${escapeHtml(ingText)}</div>
      `;

      card.addEventListener('click', () => showDetail(recipe.id));
      recipeGrid.appendChild(card);
    });
  }

  // カテゴリタブ
  categoryTabs.addEventListener('click', e => {
    const tab = e.target.closest('.cat-tab');
    if (!tab) return;
    categoryTabs.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.cat;
    renderRecipes();
  });

  // 検索
  recipeSearch.addEventListener('input', e => {
    currentSearch = e.target.value;
    renderRecipes();
  });

  // ============================================================
  // レシピ詳細モーダル
  // ============================================================
  const detailModal = document.getElementById('detail-modal');
  const detailHeader = document.getElementById('detail-header');
  const detailBody = document.getElementById('detail-body');

  function showDetail(id) {
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) return;
    viewingId = id;

    const cat = CATEGORIES[recipe.category] || CATEGORIES.other;

    detailHeader.innerHTML = `
      <div class="detail-recipe-name">${escapeHtml(recipe.name)}</div>
      <div class="detail-meta">
        <span class="detail-badge" style="border-color:${cat.color};color:${cat.color}">${cat.icon} ${cat.label}</span>
        <span class="detail-badge">⏱ ${recipe.cookTime}分</span>
        <span class="detail-badge">${DIFFICULTIES[recipe.difficulty] || ''}</span>
      </div>
    `;

    let bodyHtml = '<h3>🥕 材料</h3><ul class="detail-ingredients">';
    recipe.ingredients.forEach(ing => {
      bodyHtml += `<li><span>${escapeHtml(ing.name)}</span><span class="amount">${escapeHtml(ing.amount)}</span></li>`;
    });
    bodyHtml += '</ul>';

    bodyHtml += '<h3>📝 作り方</h3><ol class="detail-steps">';
    recipe.steps.forEach(step => {
      bodyHtml += `<li>${escapeHtml(step)}</li>`;
    });
    bodyHtml += '</ol>';

    if (recipe.memo) {
      bodyHtml += `<h3>💡 ひとこと</h3><div class="detail-memo">${escapeHtml(recipe.memo)}</div>`;
    }

    detailBody.innerHTML = bodyHtml;
    detailModal.classList.remove('hidden');
  }

  document.getElementById('detail-close-btn').addEventListener('click', () => {
    detailModal.classList.add('hidden');
    viewingId = null;
  });

  document.getElementById('detail-edit-btn').addEventListener('click', () => {
    detailModal.classList.add('hidden');
    openEditModal(viewingId);
  });

  document.getElementById('detail-delete-btn').addEventListener('click', () => {
    if (!confirm('このレシピを削除しますか？')) return;
    recipes = recipes.filter(r => r.id !== viewingId);
    saveRecipes(recipes);
    detailModal.classList.add('hidden');
    viewingId = null;
    renderRecipes();
  });

  detailModal.addEventListener('click', e => {
    if (e.target === detailModal) {
      detailModal.classList.add('hidden');
      viewingId = null;
    }
  });

  // ============================================================
  // レシピ登録/編集モーダル
  // ============================================================
  const editModal = document.getElementById('edit-modal');
  const editModalTitle = document.getElementById('edit-modal-title');
  const formName = document.getElementById('form-name');
  const formCategory = document.getElementById('form-category');
  const formTime = document.getElementById('form-time');
  const formDifficulty = document.getElementById('form-difficulty');
  const ingredientsForm = document.getElementById('ingredients-form');
  const stepsForm = document.getElementById('steps-form');
  const formMemo = document.getElementById('form-memo');

  // FABボタン
  document.getElementById('add-recipe-btn').addEventListener('click', () => openEditModal(null));

  function openEditModal(id) {
    editingId = id;

    if (id) {
      const recipe = recipes.find(r => r.id === id);
      if (!recipe) return;
      editModalTitle.textContent = '✏️ レシピ編集';
      formName.value = recipe.name;
      formCategory.value = recipe.category;
      formTime.value = recipe.cookTime;
      setDifficulty(recipe.difficulty);
      renderIngredientRows(recipe.ingredients);
      renderStepRows(recipe.steps);
      formMemo.value = recipe.memo || '';
    } else {
      editModalTitle.textContent = '🍳 レシピ追加';
      formName.value = '';
      formCategory.value = 'main';
      formTime.value = '15';
      setDifficulty('easy');
      renderIngredientRows([{ name: '', amount: '' }]);
      renderStepRows(['']);
      formMemo.value = '';
    }

    editModal.classList.remove('hidden');
    formName.focus();
  }

  function setDifficulty(diff) {
    formDifficulty.querySelectorAll('.diff-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.diff === diff);
    });
  }

  formDifficulty.addEventListener('click', e => {
    const pill = e.target.closest('.diff-pill');
    if (!pill) return;
    setDifficulty(pill.dataset.diff);
  });

  function renderIngredientRows(ingredients) {
    ingredientsForm.innerHTML = '';
    ingredients.forEach(ing => {
      addIngredientRow(ing.name, ing.amount);
    });
  }

  function addIngredientRow(name = '', amount = '') {
    const row = document.createElement('div');
    row.className = 'ingredient-row';
    row.innerHTML = `
      <input type="text" class="form-input ing-name" placeholder="材料名" value="${escapeHtml(name)}" />
      <input type="text" class="form-input ing-amount" placeholder="分量" value="${escapeHtml(amount)}" />
      <button class="row-remove-btn">✕</button>
    `;
    row.querySelector('.row-remove-btn').addEventListener('click', () => {
      if (ingredientsForm.children.length > 1) row.remove();
    });
    ingredientsForm.appendChild(row);
  }

  document.getElementById('add-ingredient-btn').addEventListener('click', () => addIngredientRow());

  function renderStepRows(steps) {
    stepsForm.innerHTML = '';
    steps.forEach((step, i) => {
      addStepRow(step, i + 1);
    });
  }

  function addStepRow(text = '', num = null) {
    if (!num) num = stepsForm.children.length + 1;
    const row = document.createElement('div');
    row.className = 'step-row';
    row.innerHTML = `
      <span class="step-num">${num}.</span>
      <input type="text" class="form-input step-input" placeholder="手順を入力" value="${escapeHtml(text)}" />
      <button class="row-remove-btn">✕</button>
    `;
    row.querySelector('.row-remove-btn').addEventListener('click', () => {
      if (stepsForm.children.length > 1) {
        row.remove();
        renumberSteps();
      }
    });
    stepsForm.appendChild(row);
  }

  function renumberSteps() {
    stepsForm.querySelectorAll('.step-row').forEach((row, i) => {
      row.querySelector('.step-num').textContent = `${i + 1}.`;
    });
  }

  document.getElementById('add-step-btn').addEventListener('click', () => addStepRow());

  // 保存
  document.getElementById('edit-save-btn').addEventListener('click', () => {
    const name = formName.value.trim();
    if (!name) {
      formName.style.borderColor = '#e85050';
      formName.focus();
      return;
    }

    const category = formCategory.value;
    const cookTime = formTime.value;
    const difficulty = formDifficulty.querySelector('.diff-pill.active')?.dataset.diff || 'easy';

    const ingredients = [];
    ingredientsForm.querySelectorAll('.ingredient-row').forEach(row => {
      const n = row.querySelector('.ing-name').value.trim();
      const a = row.querySelector('.ing-amount').value.trim();
      if (n) ingredients.push({ name: n, amount: a });
    });

    const steps = [];
    stepsForm.querySelectorAll('.step-input').forEach(input => {
      const t = input.value.trim();
      if (t) steps.push(t);
    });

    const memo = formMemo.value.trim();

    if (editingId) {
      const idx = recipes.findIndex(r => r.id === editingId);
      if (idx !== -1) {
        recipes[idx] = { ...recipes[idx], name, category, cookTime, difficulty, ingredients, steps, memo };
      }
    } else {
      recipes.push({
        id: generateId(),
        name, category, cookTime, difficulty, ingredients, steps, memo,
        createdAt: new Date().toISOString(),
      });
    }

    saveRecipes(recipes);
    editModal.classList.add('hidden');
    editingId = null;
    renderRecipes();
  });

  document.getElementById('edit-cancel-btn').addEventListener('click', () => {
    editModal.classList.add('hidden');
    editingId = null;
  });

  editModal.addEventListener('click', e => {
    if (e.target === editModal) {
      editModal.classList.add('hidden');
      editingId = null;
    }
  });

  formName.addEventListener('input', () => {
    formName.style.borderColor = '';
  });

  // ============================================================
  // 材料から探す
  // ============================================================
  const ingredientInput = document.getElementById('ingredient-input');
  const ingredientTags = document.getElementById('ingredient-tags');
  const searchResults = document.getElementById('search-results');
  const emptySearch = document.getElementById('empty-search');

  ingredientInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = ingredientInput.value.trim();
      if (val && !searchIngredients.includes(val)) {
        searchIngredients.push(val);
        renderIngredientTags();
      }
      ingredientInput.value = '';
    }
  });

  function renderIngredientTags() {
    ingredientTags.innerHTML = '';
    searchIngredients.forEach((ing, i) => {
      const tag = document.createElement('span');
      tag.className = 'ingredient-tag';
      tag.innerHTML = `${escapeHtml(ing)} <button class="tag-remove" data-idx="${i}">✕</button>`;
      ingredientTags.appendChild(tag);
    });

    ingredientTags.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        searchIngredients.splice(parseInt(btn.dataset.idx), 1);
        renderIngredientTags();
      });
    });
  }

  document.getElementById('ingredient-search-btn').addEventListener('click', () => {
    if (searchIngredients.length === 0) return;

    const results = [];

    recipes.forEach(recipe => {
      const recipeIngNames = recipe.ingredients.map(i => i.name.toLowerCase());
      let matchCount = 0;
      const missing = [];

      searchIngredients.forEach(si => {
        const siLower = si.toLowerCase();
        const found = recipeIngNames.some(ri => ri.includes(siLower) || siLower.includes(ri));
        if (found) {
          matchCount++;
        }
      });

      // 足りない材料
      recipeIngNames.forEach((ri, idx) => {
        const matched = searchIngredients.some(si => {
          const siLower = si.toLowerCase();
          return ri.includes(siLower) || siLower.includes(ri);
        });
        if (!matched) {
          missing.push(recipe.ingredients[idx].name);
        }
      });

      if (matchCount > 0) {
        const matchRate = Math.round((matchCount / recipe.ingredients.length) * 100);
        results.push({ recipe, matchCount, matchRate, missing });
      }
    });

    results.sort((a, b) => b.matchRate - a.matchRate || b.matchCount - a.matchCount);

    searchResults.innerHTML = '';

    if (results.length === 0) {
      emptySearch.classList.remove('hidden');
      emptySearch.querySelector('.empty-text').textContent = '該当するレシピが見つかりませんでした';
      return;
    }

    emptySearch.classList.add('hidden');

    results.forEach(({ recipe, matchRate, missing }) => {
      const card = document.createElement('div');
      card.className = 'search-result-card';

      const cat = CATEGORIES[recipe.category] || CATEGORIES.other;
      let badgeClass = 'low';
      if (matchRate >= 80) badgeClass = 'high';
      else if (matchRate >= 50) badgeClass = 'medium';

      let missingHtml = '';
      if (missing.length > 0) {
        missingHtml = `<div class="missing-ingredients"><span class="missing-label">足りない材料:</span> ${missing.map(m => escapeHtml(m)).join('、')}</div>`;
      }

      card.innerHTML = `
        <div class="result-header">
          <span class="result-name">${cat.icon} ${escapeHtml(recipe.name)}</span>
          <span class="match-badge ${badgeClass}">${matchRate}% 一致</span>
        </div>
        <div class="card-meta">
          <span>⏱ ${recipe.cookTime}分</span>
          <span>${DIFFICULTIES[recipe.difficulty] || ''}</span>
        </div>
        ${missingHtml}
      `;

      card.addEventListener('click', () => showDetail(recipe.id));
      searchResults.appendChild(card);
    });
  });

  // ============================================================
  // 買い物リスト
  // ============================================================
  const shoppingRecipeSelect = document.getElementById('shopping-recipe-select');
  const shoppingList = document.getElementById('shopping-list');
  const shoppingActions = document.getElementById('shopping-actions');
  const emptyShopping = document.getElementById('empty-shopping');

  function renderShopping() {
    // レシピ選択リスト
    shoppingRecipeSelect.innerHTML = '';

    if (recipes.length === 0) {
      emptyShopping.classList.remove('hidden');
      shoppingActions.classList.add('hidden');
      return;
    }

    recipes.forEach(recipe => {
      const item = document.createElement('div');
      item.className = `shopping-recipe-item${shoppingData.selected.includes(recipe.id) ? ' selected' : ''}`;
      const cat = CATEGORIES[recipe.category] || CATEGORIES.other;

      item.innerHTML = `
        <div class="shopping-check">${shoppingData.selected.includes(recipe.id) ? '✓' : ''}</div>
        <span class="shopping-recipe-name">${cat.icon} ${escapeHtml(recipe.name)}</span>
      `;

      item.addEventListener('click', () => {
        if (shoppingData.selected.includes(recipe.id)) {
          shoppingData.selected = shoppingData.selected.filter(id => id !== recipe.id);
        } else {
          shoppingData.selected.push(recipe.id);
        }
        saveShopping(shoppingData);
        renderShopping();
      });

      shoppingRecipeSelect.appendChild(item);
    });

    // 材料集計
    if (shoppingData.selected.length === 0) {
      shoppingList.innerHTML = '';
      shoppingActions.classList.add('hidden');
      emptyShopping.classList.remove('hidden');
      emptyShopping.querySelector('.empty-text').textContent = 'レシピを選んで買い物リストを作りましょう';
      return;
    }

    emptyShopping.classList.add('hidden');
    shoppingActions.classList.remove('hidden');

    const ingredientMap = new Map();
    shoppingData.selected.forEach(id => {
      const recipe = recipes.find(r => r.id === id);
      if (!recipe) return;
      recipe.ingredients.forEach(ing => {
        const key = ing.name.toLowerCase();
        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key);
          if (ing.amount && !existing.amounts.includes(ing.amount)) {
            existing.amounts.push(ing.amount);
          }
        } else {
          ingredientMap.set(key, {
            name: ing.name,
            amounts: ing.amount ? [ing.amount] : [],
          });
        }
      });
    });

    let listHtml = '<div class="shopping-list-title">📋 必要な材料</div>';

    ingredientMap.forEach((val, key) => {
      const isChecked = shoppingData.checked.includes(key);
      const amountText = val.amounts.join(' + ');
      listHtml += `
        <div class="shopping-item${isChecked ? ' checked' : ''}" data-key="${escapeHtml(key)}">
          <div class="shopping-item-check">${isChecked ? '✓' : ''}</div>
          <span class="shopping-item-name">${escapeHtml(val.name)}</span>
          <span class="shopping-item-amount">${escapeHtml(amountText)}</span>
        </div>
      `;
    });

    shoppingList.innerHTML = listHtml;

    // チェックイベント
    shoppingList.querySelectorAll('.shopping-item').forEach(item => {
      item.addEventListener('click', () => {
        const key = item.dataset.key;
        if (shoppingData.checked.includes(key)) {
          shoppingData.checked = shoppingData.checked.filter(k => k !== key);
        } else {
          shoppingData.checked.push(key);
        }
        saveShopping(shoppingData);
        renderShopping();
      });
    });
  }

  document.getElementById('clear-shopping-btn').addEventListener('click', () => {
    shoppingData = { selected: [], checked: [] };
    saveShopping(shoppingData);
    renderShopping();
  });

  // ============================================================
  // ユーティリティ
  // ============================================================
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============================================================
  // 初期化
  // ============================================================
  renderRecipes();
})();
