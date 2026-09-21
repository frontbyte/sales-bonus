/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
/*Для расчёта бонусов нужно разобраться, какую прибыль получил магазин.
Формула простая: доходы (выручка) минус расходы (себестоимость товаров).
Чтобы посчитать выручку, нужно определить, сколько точно получено с продажи с учётом скидки и других факторов.
Это можно сделать так:
    Перевести скидку из процентов в десятичное число: скидка / 100.
    Посчитать полную стоимость, умножив цену продажи на количество.
    Умножить полную стоимость на 1 - десятичная скидка, чтобы получить остаток суммы без скидки.
 */
function calculateSimpleRevenue(purchase, _product) {
    // DONE: Расчет выручки от операции
    // purchase — это одна из записей в поле items из чека в data.purchase_records
    // _product — это продукт из коллекции data.products
    const { discount, sale_price, quantity } = purchase;
    const discountCoefficient = 1 - discount / 100;
    return sale_price * quantity * discountCoefficient;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */

/* Методика расчёта бонусов такая:
15% — для продавца, который принёс наибольшую прибыль.
10% — для продавцов, которые по прибыли находятся на втором и третьем месте.
5% — для всех остальных продавцов, кроме самого последнего.
0% — для продавца на последнем месте.
*/
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    // @TODO: Расчет бонуса от позиции в рейтинге
    if (index === 0) {
        return 0.15 * profit;
    } else if (index === 1 || index === 2) {
        return 0.1 * profit;
    } else if (index === total - 1) {
        return 0;
    } else {
        return 0.05 * profit;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */

function analyzeSalesData(data, options) {
    // @DONE: Проверка входных данных
    if (
        !data ||
        !Array.isArray(data.sellers) ||
        data.sellers.length === 0 ||
        !Array.isArray(data.products) ||
        data.products.length === 0 ||
        !Array.isArray(data.purchase_records) ||
        data.purchase_records.length === 0
    ) {
        throw new Error("Некорректные входные данные");
    }
    // @DONE: Проверка наличия опций
    const { calculateRevenue, calculateBonus } = options;
    if (
        !calculateRevenue ||
        !typeof calculateRevenue === "function" ||
        !calculateBonus ||
        !typeof calculateBonus === "function"
    ) {
        throw new Error("Чего-то не хватает");
    }
    // DONE: Подготовка промежуточных данных для сбора статистики
    //        Здесь посчитаем промежуточные данные и отсортируем продавцов
    const sellerStats = data.sellers.map((seller) => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {},
    }));
    // DONE: Индексация продавцов и товаров для быстрого доступа
    // Ключом будет id, значением — запись из sellerStats
    const sellerIndex = Object.fromEntries(
        sellerStats.map((seller) => [seller.id, seller]),
    );
    // Ключом будет sku, значением — запись из data.products
    const productIndex = Object.fromEntries(
        data.products.map((product) => [product.sku, product]),
    );
    // DONE: Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach((record) => {
        // Чек
        const seller = sellerIndex[record.seller_id]; // Продавец
        // Увеличить количество продаж
        seller.sales_count++;
        // Увеличить общую сумму выручки всех продаж
        seller.revenue += record.total_amount;

        // Расчёт прибыли для каждого товара
        record.items.forEach((item) => {
            const product = productIndex[item.sku]; // Товар
            // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
            const cost = product.purchase_price * item.quantity;
            // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
            const revenue = calculateRevenue(item, product); //item.sale_price * item.quantity;
            // Посчитать прибыль: выручка минус себестоимость
            const profit = revenue - cost;
            // Увеличить общую накопленную прибыль (profit) у продавца
            seller.profit += profit;

            // Учёт количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            // По артикулу товара увеличить его проданное количество у продавца
            seller.products_sold[item.sku]++;
        });
    });
    // @DONE: Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);
    // @TODO: Назначение премий на основе ранжирования
    //        Вызовем функцию расчёта бонуса для каждого продавца в отсортированном массиве
    const sellerQuantity = sellerStats.length;
    sellerStats.forEach((seller, index) => {
        // Считаем бонус
        seller.bonus = calculateBonus(index, sellerQuantity, seller);
        // Формируем топ-10 товаров
        seller.top_products = Object.entries(seller.products_sold)
            .map((product) => ({ sku: product[0], quantity: product[1] }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });
    // @TODO: Подготовка итоговой коллекции с нужными полями
    return sellerStats.map((seller) => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2),
    }));
}
