import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios'; // Для выполнения HTTP-запросов
import PromiseFtp from 'promise-ftp';

// Токен, полученный от BotFather
const TOKEN = '6956339398:AAGLwGU77RJE66bTR1_lptMGycytWNRgYn8';
const bot = new TelegramBot(TOKEN, { polling: true });

// Настройка конфигурации FTP
const ftp = new PromiseFtp();
const ftpConfig = {
  host: "5.23.50.26",
  user: "cu10546_admin",
  password: "DfyZ791300", // !!! предупреждение о безопасности: никогда не храните пароли в исходном коде
  port: 21 // обычно FTP сервер работает на порту 21
};

// Генерация случайного номера карты
function generateCardNumber() {
    return Math.floor(Math.random() * 900000) + 100000;
  }

  // Функция для создания главного меню (inline клавиатуры)
  function mainMenu(userPhone) {
    return {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [
            {
              text: 'Главное меню',
              // Вставляем номер телефона в URL веб-приложения
              web_app: { url: `https://aimashop.webtm.ru/telegram.php?phone=${userPhone}` }
            },
          ],

          
         
        ]
      })
    };
  }

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Пожалуйста, поделитесь вашим контактом для создания бонусной карты.', {
    reply_markup: {
      one_time_keyboard: true,
      keyboard: [[{
        text: 'Поделиться контактом',
        request_contact: true
      }]],
      resize_keyboard: true
    },
    parse_mode: 'Markdown'
  });
});

bot.on('message', async (msg) => {
  if (msg.contact) {
    const chatId = msg.chat.id;
    const cardNumber = generateCardNumber();
    const userPhone = msg.contact.phone_number; // Сохраняем телефонный номер пользователя

    try {
      // Обращение к API для получения токена
      const accessTokenResponse = await axios.post('https://api-ru.iiko.services/api/1/access_token', {
        apiLogin: '69af9aa0-873' // Ваш API логин
      });

      // Если токен получен успешно, приступаем к следующей части
      if (accessTokenResponse && accessTokenResponse.data && accessTokenResponse.data.token) {
        const token = accessTokenResponse.data.token;

        // Обращение к API для регистрации клиента в системе лояльности
        const customerResponse = await axios.post('https://api-ru.iiko.services/api/1/loyalty/iiko/customer/create_or_update', {
          name: msg.from.first_name, // Имя пользователя
          phone: userPhone,
          cardNumber: cardNumber.toString(),
          cardTrack: cardNumber.toString(),
          OrganizationId: '15c47248-ecbf-4f5a-ad3f-a829bf3f413b' // Ваш OrganizationId
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (customerResponse && customerResponse.data) {
          // Отправляем меню пользователя с интегрированной бонусной картой
          const menu = mainMenu(userPhone);
          bot.sendMessage(chatId, `Спасибо за регистрацию! Ваш номер электронной карты: ${cardNumber}. Воспользуйтесь бонусами и специальными предложениями уже сейчас!`, menu);
        }
      }
    } catch (error) {
      console.error('Ошибка:', error);
      bot.sendMessage(chatId, 'К сожалению, произошла ошибка. Попробуйте позже.');
    }
  }
});

async function handleGetDiscounts(chatId) {
    try {
      await ftp.connect(ftpConfig);
      const files = await ftp.list('/aimashop/public_html/discounts_folder');

      let imagesSent = 0;
      for (const file of files) {
        // Проверяем, что файл является изображением и создаем правильный путь к файлу
        if (/.(jpg|jpeg|png)$/i.test(file)) {
          const path = `/aimashop/public_html/discounts_folder/${file}`;
          const stream = await ftp.get(path);

          await bot.sendPhoto(chatId, stream).then(() => {
            stream.resume(); // Вместо закрытия потока мы должны его возобновить для чтения
          }).catch((error) => {
            console.error('Ошибка отправки изображения:', error);
          });

          imagesSent++;
        }
      }

      if (imagesSent === 0) {
        bot.sendMessage(chatId, 'Акции в данный момент отсутствуют.');
      }

      await ftp.end();
    } catch (error) {
      console.error('Ошибка:', error);
      bot.sendMessage(chatId, 'Произошла ошибка при попытке получить акции.');
    }
  }

      bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message.chat.id;

      if (callbackQuery.data === 'get_discounts') {
        await bot.answerCallbackQuery(callbackQuery.id);
        try {
          const files = await ftp.list('/aimashop/public_html/discounts_folder');

          for (const file of files) {
            if (/.(jpg|jpeg|png)$/i.test(file.name)) {
              // Если web-сервер настроен на отдачу файлов из этой директории, можно использовать HTTP URL
              const imageUrl = `http://5.23.50.26/aimashop/public_html/discounts_folder/${file.name}`;
              await bot.sendPhoto(chatId, imageUrl);
            }
          }
        } catch (error) {
          console.error('Error in FTP operation:', error);
          await bot.sendMessage(chatId, 'Произошла ошибка при загрузке акций.');
        } finally {
          if (ftp.connected) {
            ftp.end();
          }
        }
      
    } else if (callbackQuery.data === 'get_menu') {
      // Код для отправки меню
    } else if (callbackQuery.data === 'leave_feedback') {
      // Код для обработки обратной связи
    }
    // Обработка других callback_data
  });

  bot.on('polling_error', (error) => {
    console.error('Ошибка поллинга:', error);
  });