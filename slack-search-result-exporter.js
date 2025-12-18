"use strict";

(() => {

  const enableDebugMode = true;

  const log = (value) => {
    if (enableDebugMode === true) {
      console.log(value);
    }
  };

  /**
   * Gather Slack messages in all page of search result.
   * @param messagePack
   */
  const getMessage = (messagePack) => {
    log(">>> getMessage");
    if (!messagePack.hasNextPage) {
      log("exportMessage::messagePack.hasNextPage = " + messagePack.hasNextPage);
      /* If next page doesn't exist, display popup includes gathered messages */
      showMessagesPopup(messagePack);
      return;
    }
    (async () => {
      /* Wait searched results and gather these messages */
      await createPromiseWaitSearchResult();
      do {
        await createPromiseWaitMillisecond(800);
        await createPromiseGetMessages(messagePack);
      } while (messagePack.messagePushed === true);
      await createPromiseClickNextButton(messagePack);
      await createPromiseWaitMillisecond(600);
      await createPromiseCheckOutOfPageLimit(messagePack);
      await getMessage(messagePack);
    })();
  };

  /**
   * Wait display searched result.
   */
  const createPromiseWaitSearchResult = () => {
    log(">>> createPromiseWaitSearchResult");
    const selector = ".c-search_message__content";
    const messageGroupSelector = ".c-message_group";
    const messageTimestampSelector = ".c-timestamp";
    const messageTimestampAttributeKey = "data-ts";

    const observeFunc = () => {

      let messageGroups = document.querySelectorAll(messageGroupSelector);
      let completed = true;
      messageGroups.forEach((messageGroup) => {
        let timestampElm = messageGroup.querySelector(messageTimestampSelector);
        if (!timestampElm) {
          completed = false;
          return;
        }
        let timestampAttributeValue = timestampElm.getAttribute(messageTimestampAttributeKey);
        if (!timestampAttributeValue) {
          completed = false;
        }
      });

      const el = document.querySelector(selector);
      if (el && completed) {
        return el;
      }
      return null;
    };

    return new Promise((resolve) => {

      let observedElement = observeFunc();
      if (observedElement !== null) {
        resolve(observedElement);
      }

      new MutationObserver((mutationRecords, observer) => {
        let observedElement = observeFunc();
        if (observedElement !== null) {
          resolve(observedElement);
          /* Once we have resolved we don't need the observer anymore */
          observer.disconnect();
        }
      })
        .observe(document.documentElement, {
          childList: true,
          subtree: true
        });
    });
  };

  /**
   * Get message
   */
  const createPromiseGetMessages = async (messagePack) => {
    log(">>> createPromiseGetMessages");
    const messageGroupSelector = '[role="document"]';
    const messageContentSelector = ".c-search_message__content";
    const messageTimestampSelector = ".c-timestamp";
    const messageTimestampAttributeKey = "data-ts";
    const channelNameSelector = '[data-qa="inline_channel_entity__name"]';
    const messageSenderSelector = ".c-message__sender_button";
    const timestampLabelSelector = ".c-timestamp__label";

    return new Promise((resolve) => {
      messagePack.messagePushed = false;
      let messageGroups = document.querySelectorAll(messageGroupSelector);
      log("createPromiseGetMessages | Promise | messageGroups.length = " + messageGroups.length);

      messageGroups.forEach((messageGroup) => {
        const datetime = timestampToTime(messageGroup.querySelector(messageTimestampSelector).getAttribute(messageTimestampAttributeKey).split(".")[0]);
        /* qiita_twitter_bot */
        const channelNameDom = messageGroup.querySelector(channelNameSelector);
        let channelName =
          channelNameDom == null ? "DirectMessage" : channelNameDom.textContent;
        /* twitter */
        const messageSender = messageGroup.querySelector(messageSenderSelector).textContent;
        /* 8:00 PM */
        const timestampLabel = messageGroup.querySelector(timestampLabelSelector).textContent;
        /* twitterAPP 8:00 PM slack message here ...  */
        const messageElement = messageGroup.querySelector(messageContentSelector);

        /* Skip if message element not found */
        if (!messageElement) {
          log("createPromiseGetMessages | messageElement not found, skipping");
          return;
        }

        /* Clone the element to avoid modifying the original DOM */
        const messageClone = messageElement.cloneNode(true);

        /* Remove common Slack link preview/unfurl elements before text extraction */
        const previewSelectors = [
          '.c-link__label',           // Link preview label
          '.c-message_attachment',    // Link unfurl attachments (general)
          '.c-search_message__attachments', // Search result attachments container
          '.c-search_message__attachment',  // Search result individual attachment
          '.c-message__unfurl',       // Unfurl container
          '.c-file_attachment',       // File attachments
          '.c-message__img_attachment', // Image attachments
          '[data-qa="message_attachment"]', // Data-qa attribute based selector
          '.c-message_kit__attachment', // Message kit attachments
          '.c-message_kit__file'       // Message kit files
        ];
        previewSelectors.forEach(selector => {
          const elements = messageClone.querySelectorAll(selector);
          elements.forEach(el => el.remove());
        });

        /* Convert <br> tags to newlines before getting textContent */
        const brTags = messageClone.querySelectorAll('br');
        brTags.forEach(br => {
          br.replaceWith(document.createTextNode('\n'));
        });

        const message = messageClone.textContent;

        /* Extract external links from cleaned clone (not original element) */
        const externalLinks = extractExternalLinks(messageClone);
        log("createPromiseGetMessages | Extracted " + externalLinks.length + " external links");
        log("createPromiseGetMessages | Message before conversion: " + message);
        const messageWithMarkdownLinks = convertMessageWithMarkdownLinks(message, externalLinks);
        log("createPromiseGetMessages | Message after conversion: " + messageWithMarkdownLinks);

        const removeMessageSender = new RegExp('^' + escapeRegExp(messageSender));
        const removeTimestampLabel = new RegExp('^.*?' + timestampLabel);
        /* APP 8:00 PM slack message here ...  */
        let trimmedMessage = messageWithMarkdownLinks.replace(removeMessageSender, '').replace(removeTimestampLabel, '');

        /* Replace actual newlines with <br> for TSV compatibility */
        trimmedMessage = trimmedMessage.replace(/\n/g, '<br>');
        /* 2020/12/19 20:00:20 <tab> qiita_twitter_bot <tab> twitter <tab> slack message here ...  */
        const timeAndMessage = datetime + "\t" + channelName + "\t" + messageSender + "\t" + trimmedMessage;
        log("createPromiseGetMessages | Promise | messageGroups.forEach | " + [datetime, channelName, messageSender, timestampLabel, message].join(", "));
        log("createPromiseGetMessages | Promise | messageGroups.forEach | " + timeAndMessage);
        if (messagePack.messageSet.has(timeAndMessage)) {
          log("createPromiseGetMessages | Promise | messagePack.messageSet.has(timeAndMessage) === true | " + timeAndMessage);
          return;
        }
        messagePack.messages.push(timeAndMessage);
        messagePack.messagePushed = true;
        messagePack.messageSet.add(timeAndMessage);
        messageGroup.scrollIntoView();
      });
      resolve(messagePack);
    });
  };

  /**
   * Click next page link
   */
  const createPromiseClickNextButton = (messagePack) => {
    log(">>> createPromiseClickNextButton");

    const arrowBtnElements = document.querySelectorAll(".c-pagination__arrow_btn");
    let nextArrowBtnElement = null;
    messagePack.hasNextPage = false;
    if (arrowBtnElements.length === 0) {
      /* Return dummy promise */
      return new Promise((resolve) => {
        resolve(messagePack);
      });
    }
    arrowBtnElements.forEach((e) => {
      if (["Next page", "次のページ"].includes(e.getAttribute("aria-label"))) {
        nextArrowBtnElement = e;
      }
    });
    if (!nextArrowBtnElement) {
      log("createPromiseClickNextButton | Next page button not found.");
      return new Promise((resolve) => {
        resolve(messagePack);
      });
    }
    messagePack.hasNextPage = nextArrowBtnElement.attributes["aria-disabled"].value === 'false';
    if (!messagePack.hasNextPage) {
      log("createPromiseClickNextButton | messagePack.hasNextPage = " + messagePack.hasNextPage);
      /* Return dummy promise */
      return new Promise((resolve) => {
        resolve(messagePack);
      });
    }
    return new Promise((resolve) => {
      log("createPromiseClickNextButton | Promise | click()");
      nextArrowBtnElement.click();
      resolve(messagePack);
    });
  };

  /**
   * Check if the next page is out of the page limit
   */
  const createPromiseCheckOutOfPageLimit = (messagePack) => {
    log(">>> createPromiseCheckOutOfPageLimit");
    const selector = ".c-search_message__content";
    let el = document.querySelector(selector);
    if (el === null) {
      messagePack.hasNextPage = false;
    }
    return new Promise((resolve) => {
      resolve(messagePack);
    });
  };


  /**
   * Wait specified millisecond
   */
  const createPromiseWaitMillisecond = (millisecond) => {
    return new Promise(resolve => setTimeout(resolve, millisecond));
  };

  /**
   * timestamp to datetame
   * @param timestamp
   * @returns {string}
   */
  const timestampToTime = (timestamp) => {
    const d = new Date(timestamp * Math.pow(10, 13 - timestamp.length));
    const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const yyyy = d.getFullYear();
    const mm = ("0" + (d.getMonth() + 1)).slice(-2);
    const dd = ("0" + d.getDate()).slice(-2);
    const hh = ("0" + d.getHours()).slice(-2);
    const mi = ("0" + d.getMinutes()).slice(-2);
    const ss = ("0" + d.getSeconds()).slice(-2);
    const week = weekday[d.getDay()];
    return `${yyyy}-${mm}-${dd} ${week} ${hh}:${mi}:${ss}`;
  };

  /**
   * Escape regex meta characters
   * > Escape string for use in Javascript regex - Stack Overflow
   * > https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
   * @param stringValue
   * @returns {*}
   */
  const escapeRegExp = (stringValue) => {
    /* $& means the whole matched string */
    return stringValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  /**
   * Extract external URL links from DOM element (http/https only)
   * @param {HTMLElement} element - Message element
   * @returns {Array<{text: string, url: string}>} - Array of link text and URL pairs
   */
  const extractExternalLinks = (element) => {
    log(">>> extractExternalLinks");

    /* Handle null/undefined element */
    if (!element) {
      log("extractExternalLinks | element is null or undefined");
      return [];
    }

    /* Get all <a> tags from element */
    const links = element.querySelectorAll('a');
    log("extractExternalLinks | Found " + links.length + " total links");

    /* Filter only external URLs (http/https) and exclude Slack internal links */
    const externalLinks = Array.from(links)
      .filter(link => {
        /* Check if URL starts with http/https */
        if (!/^https?:\/\//.test(link.href)) {
          return false;
        }
        /* Exclude Slack workspace URLs (e.g., https://xxx.slack.com/...) */
        if (/^https?:\/\/[^/]+\.slack\.com\//.test(link.href)) {
          return false;
        }
        return true;
      })
      .map(link => {
        /* Get only the direct text content of the link, excluding nested elements */
        let linkText = '';
        for (let node of link.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            linkText += node.textContent;
          }
        }
        /* If no direct text nodes, fall back to textContent (trimmed) */
        if (!linkText.trim()) {
          linkText = link.textContent.trim();
        }
        return {
          text: linkText.trim(),
          url: link.href
        };
      });

    log("extractExternalLinks | Filtered to " + externalLinks.length + " external links");
    return externalLinks;
  };

  /**
   * Convert message with Markdown-formatted links
   * @param {string} message - Original message text
   * @param {Array<{text: string, url: string}>} links - Array of link objects
   * @returns {string} - Message with Markdown-formatted links
   */
  const convertMessageWithMarkdownLinks = (message, links) => {
    log(">>> convertMessageWithMarkdownLinks");

    /* Handle empty links array - return message as-is */
    if (!links || links.length === 0) {
      log("convertMessageWithMarkdownLinks | No links to convert");
      return message;
    }

    log("convertMessageWithMarkdownLinks | Converting " + links.length + " links");
    let result = message;

    /* Replace each link text with Markdown format [text](url) */
    links.forEach((link, index) => {
      /* Skip if link text or url is missing */
      if (!link.text || !link.url) {
        log("convertMessageWithMarkdownLinks | Skipping invalid link at index " + index);
        return;
      }

      const markdownLink = "[" + link.text + "](" + link.url + ")";
      const escapedText = escapeRegExp(link.text);

      /* Replace all occurrences of link text with Markdown format (global flag) */
      const regex = new RegExp(escapedText, 'g');
      result = result.replace(regex, markdownLink);

      log("convertMessageWithMarkdownLinks | Replaced '" + link.text + "' with '" + markdownLink + "'");
    });

    return result;
  };

  /**
   * Display messages as a popup window.
   * [!] It seems like large text content cannot be copied automatically by js. So this script made user copies gathered messages by oneself.
   * > javascript - Copying to clipboard with document.execCommand('copy') fails with big texts - Stack Overflow
   * > https://stackoverflow.com/questions/44774820/copying-to-clipboard-with-document-execcommandcopy-fails-with-big-texts
   * @param messagePack
   * @returns {boolean}
   */
  const showMessagesPopup = (messagePack) => {
    log(">>> showMessagesPopup");
    const massageAll = messagePack.messages.join("\n");
    log("showMessagesPopup | messagePack.messages.length " + messagePack.messages.length);
    log("showMessagesPopup | massageAll.length " + massageAll.length);

    const textareaElement = document.createElement("textarea");
    /* html - How to adjust textarea size with javascript? - Stack Overflow */
    /* https://stackoverflow.com/questions/31734233/how-to-adjust-textarea-size-with-javascript */
    textareaElement.rows = 10;
    textareaElement.cols = 50;
    textareaElement.textContent = massageAll;

    /* Open window in JavaScript with HTML inserted - Stack Overflow */
    /* https://stackoverflow.com/questions/2109205/open-window-in-javascript-with-html-inserted */
    const win = window.open("", "Slack messages", "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=500,height=300,top=" + (screen.height - 200) + ",left=" + (screen.width - 200));
    win.document.body.appendChild(textareaElement);

    return true;
  };

  const exportMessage = () => {
    log(">>> exportMessage");
    const messagePack = {
      messages: [],
      messageSet: new Set(),
      messagePushed: false,
      hasNextPage: true,  /* To handle a first loop */
    };
    /* Gather messages in all pages */
    getMessage(messagePack);
  };

  /* Run */
  exportMessage();
})();
