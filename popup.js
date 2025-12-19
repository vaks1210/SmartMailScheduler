window.onload = function () {
  let content1 = document.getElementById("scraped-content1");
  let content3 = document.getElementById("analysis-result");
  let content4 = document.getElementById("successful");
  let button1 = document.getElementById("button1");
  let button2 = document.getElementById("button2");
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.title) {
      content1.textContent = request.title;
    }
    if (request.date || request.time || request.duration) {
      const time = request.time;
      const date = request.date;
      const duration = request.duration;
      const timezone = request.timezone;
      const summary = request.summary;
      content3.textContent = `DATE:${date} TIME:${time}  DURATION:${duration} TIMEZONE:${timezone} SUMMARY:${summary}`;
      button2.disabled = false;
      var parts = date.split("/");
      var day = parseInt(parts[0]);
      var month = parseInt(parts[1]) - 1;
      var year = parseInt(parts[2]);
      var parts2 = time.split(":");
      var hour = parseInt(parts2[0]);
      var mins = parseInt(parts2[1]);
      console.log(
        year +
          ":" +
          month +
          ":" +
          day +
          ":" +
          hour +
          ":" +
          mins +
          ":" +
          timezone +
          ":" +
          summary
      );
      console.log(typeof summary);
      const timezoneOffsets = {
        IST: 330,
        UTC: 0,
        GMT: 0,
      };

      var offsetMinutes = timezoneOffsets[timezone] || 0;
      var startDate = new Date(
        Date.UTC(year, month, day, hour, mins) - offsetMinutes * 60 * 1000
      );
      var endDate = new Date(
        Date.UTC(year, month, day, hour, mins) -
          (offsetMinutes - duration) * 60 * 1000
      );
      var formattedDate1 = startDate.toISOString();
      var formattedDate2 = endDate.toISOString();
      chrome.storage.local.set({
        startTime: formattedDate1,
        endTime: formattedDate2,
        summary: summary,
      });
      console.log(
        `start date: ${formattedDate1} \n end date: ${formattedDate2}`
      );
    } else {
      content3.textContent = "Pata nhi kya ho gaya bc";
    }
  });

  button1.addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
      target: {
        tabId: tab.id,
      },
      function: scrapeEmailContent,
    });
  });

  async function scrapeEmailContent() {
    const h2Element = document.querySelector('h2[jsname="r4nke"].hP');
    const paragraph = document.querySelector(".a3s.aiL");
    let message = {};

    if (h2Element ) {
      message.title = h2Element.textContent;
      
    } else {
      message.title = "Subject not found";
    }
    const text = paragraph.textContent;
    const url = "https://ai-textraction.p.rapidapi.com/textraction";
    const options = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-RapidAPI-Key": "d2e55fb790mshb0733bd3ab271e8p1d5c5ejsn53aa94096189",
        //"X-RapidAPI-Host": "ai-textraction.p.rapidapi.com",
      },
      body: JSON.stringify({
        text: text,
        entities: [
          {
            description:
              "any date in the text and convert them dd/mm/yyyy format and always take year to be 2023 unless otherwise mentioned in the text",
            type: "string",
            var_name: "date",
          },
          {
            description: "any duration in the text.Make sure the duration is for the event only. in minutes only format",
            type: "string",
            var_name: "duration",
          },
          {
            description:
              "any time mentioned in the text in HH:MM:SSSS format, if not mentioned default: 00:00:0000",
            type: "string",
            var_name: "time",
          },
          {
            description:
              "TIMEZONE CODE OF THREE LETTERS when not accompanied by a + or -.for example GMT,UTC is correct,but GMT+5:30 IS INCORRECT. if nothing mentioned use IST",
            type: "string",
            var_name: "timezone",
          },
          {
            description: "summary of the event in less than 6 words",
            type: "string",
            var_name: "summary",
          },
        ],
      }),
    };

    try {
      const response = await fetch(url, options);
      const result = await response.json();
      const date = result.results.date;
      const time = result.results.time;
      const timezone = result.results.timezone;
      const summary = result.results.summary;
      message.date = date;
      message.time = time;
      message.duration = result.results.duration || 60;
      message.timezone = timezone;
      message.summary = summary;
    } catch (error) {
      console.error(error);
      message.date = error;
    }

    chrome.runtime.sendMessage(message);
  }
  button2.addEventListener("click", function () {
    chrome.storage.local.get(
      ["startTime", "endTime", "summary"],
      function (data) {
        const { startTime, endTime, summary } = data;

        if (startTime !== undefined && endTime !== undefined) {
          console.log(
            `BUTTON3: START-TIME: ${startTime} \n END-TIME: ${endTime} SUMMARY: ${summary}`
          );

          chrome.identity.getAuthToken({ interactive: true }, function (token) {
            let init = {
              method: "POST",
              async: true,
              headers: {
                Authorization: "Bearer " + token,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                summary: summary,
                start: {
                  dateTime: startTime,
                },
                end: {
                  dateTime: endTime,
                },
              }),
            };

            fetch(
              "https://www.googleapis.com/calendar/v3/calendars/primary/events?key=AIzaSyDBqNFby0J-7ewDbhjeVaJYX3g47HB2EfI",
              init
            )
              .then(function (response) {
                if (!response.ok) {
                  throw new Error("Network response was not ok");
                }
                return response.json();
              })
              .then(function (data) {
                console.log("Event created successfully:", data.status);
                chrome.storage.local.set({
                  startTime: null,
                  endTime: null,
                  summary: null,
                });
                if (data.status == "confirmed") {
                  content4.textContent = "EVENT CREATED SUCCESSFULLY!!";
                }
              })
              .catch(function (error) {
                console.error("Error:", error);
                content4.textContent =
                  "SOME ERROR HAS OCCURRED. Check the console for more details.";
              });
          });
        } else {
          console.error("Data not found in storage.");
        }
      }
    );
  });
};
