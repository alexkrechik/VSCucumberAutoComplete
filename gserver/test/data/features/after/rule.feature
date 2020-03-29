Feature: Highlander

  This text is
  at the feature level

  Rule: There can be only One

    Example: Only One -- More than one alive
      Given there are 3 ninjas
      And there are more than one ninja alive
      When 2 ninjas meet, they will fight
      Then one ninja dies (but not me)
      And there is one ninja less alive

    Example: Only One -- One alive
      Given there is only 1 ninja alive
      Then he (or she) will live forever ;-)

  Rule: Users are notified about overdue tasks on first use of the day

  This text is
  at the rule level

    Background:

    This text is
    at the rule background level

      Given I have overdue tasks

    Example: First use of the day

    This text is
    at the rule example level

      Given I last used the app yesterday
      When I use the app
      Then I am notified about overdue tasks

    Example: Already used today

    This text is
    also at the rule example level

      Given I last used the app earlier today
      When I use the app
      Then I am not notified about overdue tasks
