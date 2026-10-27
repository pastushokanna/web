import { Command } from 'commander';
import fs from 'fs';
const program = new Command();

program
    .name('restaurant-cli')
    .description('CLI для управління та перегляду меню ресторану')
    .version('1.0.0');

program.option('-f, --file <path>', 'шлях до JSON файлу з даними', 'data.json');

function loadData(filePath) {
    try {
        const rawData = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(rawData);
    } catch (error) {
        console.error(`Помилка читання файлу ${filePath}:`, error.message);
        process.exit(1);
    }
}
function getAllDishes(data) {
    const dishes = [];
    if (data.categories && Array.isArray(data.categories)) {
        data.categories.forEach(cat => {
            if (cat.dishes && Array.isArray(cat.dishes)) {
                cat.dishes.forEach(d => {
                    dishes.push({ ...d, categoryName: cat.name });
                });
            }
        });
    }
    return dishes;
}

program
    .command('list')
    .description('вивести список усіх страв у меню')
    .option('-l, --limit <number>', 'обмежити кількість елементів', parseInt)
    .action((options) => {
        const data = loadData(program.opts().file);
        let dishes = getAllDishes(data);
        if (options.limit && !isNaN(options.limit)) {
            dishes = dishes.slice(0, options.limit);
        }
        console.log(`--- Список страв (всього: ${dishes.length}) ---`);
        dishes.forEach(d => {
            console.log(`ID: ${d.id} | Назва: ${d.name} | Ціна: ${d.price} грн | Категорія: ${d.categoryName}`);
        });
    });

program
    .command('item <id>')
    .description('вивести детальну інформацію про страву за ID')
    .action((id) => {
        const data = loadData(program.opts().file);
        const dishes = getAllDishes(data);
        const dish = dishes.find(d => d.id === id);

        if (!dish) {
            console.error(`Страва з ID "${id}" не знайдена.`);
            process.exit(1);
        }
        console.log(JSON.stringify(dish, null, 2));
    });

program
    .command('field <id> <fieldPath>')
    .description('вивести значення конкретного поля страви за ID')
    .action((id, fieldPath) => {
        const data = loadData(program.opts().file);
        const dishes = getAllDishes(data);
        const dish = dishes.find(d => d.id === id);

        if (!dish) {
            console.error(`Страва за ID "${id}" не знайдена.`);
            process.exit(1);
        }

        const keys = fieldPath.split('.');
        let result = dish;
        for (const key of keys) {
            if (result && Object.prototype.hasOwnProperty.call(result, key)) {
                result = result[key];
            } else {
                console.error(`Поле "${fieldPath}" не знайдено у страві.`);
                process.exit(1);
            }
        }

        console.log(typeof result === 'object' ? JSON.stringify(result, null, 2) : result);
    });

program
    .command('category <categoryId>')
    .description('вивести список страв у конкретній категорії за її ID')
    .action((categoryId) => {
        const data = loadData(program.opts().file);
        const category = data.categories?.find(c => c.id === categoryId);

        if (!category) {
            console.error(`Категорія з ID "${categoryId}" не знайдена.`);
            process.exit(1);
        }
        console.log(`--- Категорія:${category.name} (ID: ${category.id}) ---`);
        category.dishes.forEach(d => {
            console.log(`ID: ${d.id} | Назва: ${d.name} | Ціна: ${d.price} грн`);
        });
    });

program
    .command('filter')
    .description('фільтрувати страви за ціною та ознаками (вегетеріанське/гостре)')
    .option('--max-price <number>', 'максимальна ціна', parseFloat)
    .option('--min-price <number>', 'мінімальна ціна', parseFloat)
    .option('--veg', 'тільки вегетаріанські страви')
    .option('--spicy', 'тільки гострі страви')
    .action((options) => {
        const data = loadData(program.opts().file);
        let dishes = getAllDishes(data);
        if (options.maxPrice) {
            dishes = dishes.filter(d => d.price <= options.maxPrice);
        }
        if (options.minPrice) {
            dishes = dishes.filter(d => d.price >= options.minPrice);
        }
        if (options.veg) {
            dishes = dishes.filter(d => d.isVegetarian === true);
        }
        if (options.spice) {
            dishes = dishes.filter(d => d.isSpicy === true);
        }
        console.log(`--- Відфільтровані страви (${dishes.length}) ---`);
        dishes.forEach(d => {
            console.log(`ID: ${d.id} | Назва: ${d.name} | Ціна: ${d.price} грн | Вег: ${d.isVegetarian} | Гостре: ${d.isSpicy}`);
        });
    });

program
    .command('ingredient <name>')
    .description('знайти всі страви, які містять вказаних інгредієнт')
    .action((name) => {
        const data = loadData(program.opts().file);
        const dishes = getAllDishes(data);
        const query = name.toLowerCase();

        const matchedDishes = dishes.filter(d =>
            Array.isArray(d.ingredients) && d.ingredients.some(ing => ing.toLowerCase().includes(query))
        );
        console.log(`--- Страви з інгредієнтом "${name}" (${matchedDishes.length}) ---`);
        matchedDishes.forEach(d => {
            console.log(`ID: ${d.id} | Назва: ${d.name} | Інгредієнти: ${d.ingredients.join(',')}`);
        });
    });

program.parse(process.argv);