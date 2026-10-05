on validateURL(targetURL)
  if targetURL does not start with "https://www.zhihu.com/" then error "Only https://www.zhihu.com/ is allowed"
end validateURL

on run argv
  set operation to item 1 of argv
  if operation is "tabs" then
    set resultText to ""
    tell application "Google Chrome"
      repeat with browserWindow in windows
        repeat with browserTab in tabs of browserWindow
          if URL of browserTab starts with "https://www.zhihu.com/" then set resultText to resultText & ((id of browserTab) as text) & " " & (URL of browserTab) & linefeed
        end repeat
      end repeat
    end tell
    return resultText
  end if
  if operation is "open" then
    set targetURL to item 2 of argv
    my validateURL(targetURL)
    tell application "Google Chrome"
      if (count of windows) is 0 then make new window
      set createdTab to make new tab at end of tabs of front window with properties {URL:targetURL}
      return (id of createdTab) as text
    end tell
  end if
  set targetID to item 2 of argv
  if operation is "execute" then
    set codePath to POSIX file (item 3 of argv)
    set codeText to read codePath as «class utf8»
  end if
  tell application "Google Chrome"
    repeat with browserWindow in windows
      repeat with browserTab in tabs of browserWindow
        if ((id of browserTab) as text) is (targetID as text) then
          my validateURL(URL of browserTab)
          if operation is "navigate" then
            set targetURL to item 3 of argv
            my validateURL(targetURL)
            set URL of browserTab to targetURL
            return "OK"
          else if operation is "execute" then
            return execute browserTab javascript codeText
          end if
        end if
      end repeat
    end repeat
  end tell
  error "Managed tab is closed or unavailable; no other tab was selected"
end run
