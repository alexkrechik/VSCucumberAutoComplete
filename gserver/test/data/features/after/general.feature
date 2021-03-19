@Fast
Feature: Formatting feature

	This feature was created to test formatting


	Background: Background name

		Given the following users exist:
			| name   | email              | twitter         | CJK Message 訊息    |
			| Aslak  | aslak@cucumber.io  | @aslak_hellesoy | ʏᴏᴏ Hello world     |
			| Julien | julien@cucumber.io | @jbpros         | Yoo 你好 世界       |
			| Matt   | matt@cucumber.io   | @mattwynne      | Yoo こんにちは 世界 |


	#This comment is related to this Scenario:
	Scenario: Some scenario

		#Comment related to the next string
		Given I prepare for something
			"""
    Some comment regarding prevous step
    Separated into two lined
        This line begins from several extra tabs
    But this line not
			"""

			And here is the json
			"""
			[
				{
					"json": "text"
				}
			]
			"""

			And here is the tagged json
			"""
			[
				{
					"<json>": <text>
				}
			]
			"""


	@Other
	Scenario: Some other scenario

			When I do something
			And do another thing
			Then I should have a valid result
				But not an invalid result


	Scenario: Should properly format star gherkin word

		* I do something


Scenario Outline: feeding a suckler cow

		Given the cow weighs <weight> kg
		And the rabbit weighs <protein> kg
			When we calculate the feeding requirements
			Then the energy should be <energy> MJ
			And the protein should be <protein> kg

		Examples:
			| weight | energy        | protein |
			| 450    | 26500         | 215     |
			| 500    | 29500000      | 245     |
			| 575    | 31500         | 255     |
			| 600000 | 37000         | 305     |
			| 345    | 340\|350\|360 | 100     |

#Last string with comment
